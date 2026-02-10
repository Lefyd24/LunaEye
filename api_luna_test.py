"""
API Platform Implementation

Provides REST and WebSocket endpoints for the agent.
"""

from typing import Any, Optional, Set
from dataclasses import dataclass, field
import asyncio
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ..base import (
    BasePlatform,
    PlatformType,
    PlatformConfig,
    PlatformMessage,
    PlatformResponse,
    PlainTextFormatter,
    ToolCallback,
)

# Import logging config - handle both relative and absolute imports
try:
    from ...logging_config import get_logger, log_platform_start, log_platform_stop, log_message_received, log_message_sent, log_error
except ImportError:
    from logging_config import get_logger, log_platform_start, log_platform_stop, log_message_received, log_message_sent, log_error

logger = get_logger(__name__)


# ============================================================================
# Request/Response Models
# ============================================================================

class ChatRequest(BaseModel):
    """Chat endpoint request."""
    text: str
    thread_id: str = "default"
    user_name: Optional[str] = None


class ChatResponse(BaseModel):
    """Chat endpoint response."""
    response: str
    tools_used: list[str]
    thread_id: str


class StatusResponse(BaseModel):
    """Status endpoint response."""
    status: str
    agent_ready: bool
    tools_count: int


class ClearRequest(BaseModel):
    """Clear history request."""
    thread_id: str = "default"


# ============================================================================
# API Configuration
# ============================================================================

@dataclass
class APIConfig(PlatformConfig):
    """API-specific configuration."""
    
    platform_type: PlatformType = PlatformType.API
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = field(default_factory=lambda: ["*"])
    enable_websocket: bool = True
    api_prefix: str = ""


# ============================================================================
# API Platform
# ============================================================================

class APIPlatform(BasePlatform):
    """
    REST and WebSocket API platform.
    
    Provides:
    - POST /chat - Process messages
    - GET /status - Agent status
    - POST /clear - Clear history
    - WS /ws - WebSocket streaming
    """
    
    platform_type = PlatformType.API
    
    def __init__(self, config: Optional[APIConfig] = None):
        super().__init__(config or APIConfig())
        self.config: APIConfig = self.config
        self._formatter = PlainTextFormatter()
        self._app: Optional[FastAPI] = None
        self._active_websockets: Set[WebSocket] = set()
        self._server = None
    
    def create_app(self) -> FastAPI:
        """Create and configure the FastAPI application."""
        app = FastAPI(
            title="Luna Smart Home Agent API",
            description="REST and WebSocket API for Luna AI Assistant",
            version="2.0.0",
        )
        
        # Add CORS middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=self.config.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Register routes
        self._register_routes(app)
        
        self._app = app
        return app
    
    def _register_routes(self, app: FastAPI) -> None:
        """Register API routes."""
        prefix = self.config.api_prefix
        
        @app.get(f"{prefix}/")
        async def root():
            """Root endpoint."""
            return {
                "service": "Luna Smart Home Agent API",
                "version": "2.0.0",
                "status": "running",
            }
        
        @app.get(f"{prefix}/status", response_model=StatusResponse)
        async def get_status():
            """Get agent status."""
            tools_count = 0
            if self._agent and hasattr(self._agent, 'tools'):
                tools_count = len(self._agent.tools)
            
            return StatusResponse(
                status="operational" if self._agent else "not_ready",
                agent_ready=self._agent is not None,
                tools_count=tools_count,
            )
        
        @app.post(f"{prefix}/chat", response_model=ChatResponse)
        async def chat(request: ChatRequest):
            """Process a chat message."""
            if not self._agent:
                raise HTTPException(status_code=503, detail="Agent not initialized")
            
            # Log incoming message
            log_message_received("api", request.user_name or "api_user", request.thread_id, request.text)
            
            message = PlatformMessage(
                content=request.text,
                user_id=request.user_name or "api_user",
                thread_id=request.thread_id,
                platform=PlatformType.API,
                user_name=request.user_name,
            )
            
            response = await self.process_message(message)
            
            # Log outgoing message
            log_message_sent("api", request.thread_id, response.tools_used, response.content)
            
            return ChatResponse(
                response=response.content,
                tools_used=response.tools_used,
                thread_id=request.thread_id,
            )
        
        @app.post(f"{prefix}/clear")
        async def clear_history(request: ClearRequest):
            """Clear conversation history."""
            if not self._agent:
                raise HTTPException(status_code=503, detail="Agent not initialized")
            
            await self._agent.clear_history(request.thread_id)
            return {"status": "cleared", "thread_id": request.thread_id}
        
        if self.config.enable_websocket:
            @app.websocket(f"{prefix}/ws")
            async def websocket_endpoint(websocket: WebSocket):
                """WebSocket endpoint for streaming."""
                await self._handle_websocket(websocket)
    
    async def _handle_websocket(self, websocket: WebSocket) -> None:
        """Handle a WebSocket connection."""
        await websocket.accept()
        self._active_websockets.add(websocket)
        client_id = id(websocket)
        thread_id = f"ws_{client_id}"
        
        logger.info(f"WebSocket client connected: {client_id}")
        
        try:
            # Send hello
            await websocket.send_json({
                "type": "hello",
                "client_id": str(client_id),
                "thread_id": thread_id,
            })
            
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type", "")
                
                if msg_type == "heartbeat":
                    await websocket.send_json({"type": "heartbeat_ack"})
                
                elif msg_type == "input.text":
                    text = data.get("text", "")
                    if text:
                        # Log incoming message
                        log_message_received("api.websocket", f"ws_{client_id}", thread_id, text)
                        
                        await self._process_ws_message(websocket, text, thread_id)
                
                elif msg_type == "clear":
                    if self._agent:
                        await self._agent.clear_history(thread_id)
                    await websocket.send_json({"type": "cleared"})
                
        except WebSocketDisconnect:
            logger.info(f"WebSocket client disconnected: {client_id}")
        except Exception as e:
            log_error("api.websocket", e, {"client_id": client_id, "thread_id": thread_id})
        finally:
            self._active_websockets.discard(websocket)
    
    async def _process_ws_message(
        self,
        websocket: WebSocket,
        text: str,
        thread_id: str,
    ) -> None:
        """Process a WebSocket message."""
        # Send thinking state
        await websocket.send_json({"type": "state.change", "state": "THINKING"})
        
        message = PlatformMessage(
            content=text,
            user_id=f"ws_{id(websocket)}",
            thread_id=thread_id,
            platform=PlatformType.WEBSOCKET,
        )
        
        # Tool callback for WebSocket
        async def ws_tool_callback(tool_name: str, args: dict) -> None:
            await websocket.send_json({
                "type": "tool.start",
                "tool": tool_name,
                "arguments": args,
            })
        
        response = await self.process_message(message, ws_tool_callback)
        
        # Send response
        await websocket.send_json({"type": "state.change", "state": "SPEAKING"})
        await websocket.send_json({
            "type": "text.response",
            "text": response.content,
            "tools_used": response.tools_used,
        })
        await websocket.send_json({"type": "state.change", "state": "IDLE"})
        
        # Log outgoing message
        log_message_sent("api.websocket", thread_id, response.tools_used, response.content)
    
    async def start(self) -> None:
        """Start the API server."""
        import uvicorn
        
        # Log platform startup
        config_dict = {
            "host": self.config.host,
            "port": self.config.port,
            "cors_origins": self.config.cors_origins,
            "enable_websocket": self.config.enable_websocket,
            "api_prefix": self.config.api_prefix,
        }
        log_platform_start("api", config_dict)
        
        if not self._app:
            self.create_app()
        
        self._running = True
        
        config = uvicorn.Config(
            self._app,
            host=self.config.host,
            port=self.config.port,
            log_level="info",
        )
        self._server = uvicorn.Server(config)
        
        logger.info(f"Starting API server on http://{self.config.host}:{self.config.port}")
        await self._server.serve()
    
    async def stop(self) -> None:
        """Stop the API server."""
        self._running = False
        
        # Close all WebSocket connections
        for ws in list(self._active_websockets):
            try:
                await ws.close()
            except Exception:
                pass
        self._active_websockets.clear()
        
        if self._server:
            self._server.should_exit = True
        
        log_platform_stop("api")
        logger.info("API server stopped")
    
    async def send_response(
        self,
        response: PlatformResponse,
        destination: Any,
    ) -> None:
        """Send response (used for WebSocket push)."""
        if isinstance(destination, WebSocket):
            try:
                await destination.send_json({
                    "type": "notification",
                    "message": response.content,
                })
            except Exception as e:
                logger.error(f"Failed to send to WebSocket: {e}")
    
    async def process_message(
        self,
        message: PlatformMessage,
        tool_callback: Optional[ToolCallback] = None,
    ) -> PlatformResponse:
        """Process an API message through the agent."""
        if not self._agent:
            return PlatformResponse(
                content="Agent not initialized",
                thread_id=message.thread_id,
            )
        
        try:
            response_text, tools_used = await self._agent.process(
                user_message=message.content,
                thread_id=message.thread_id,
                user_name=message.user_name,
                tool_callback=tool_callback,
                platform="api",
            )
            
            return PlatformResponse(
                content=response_text,
                thread_id=message.thread_id,
                tools_used=tools_used,
            )
            
        except Exception as e:
            log_error("api", e, {"thread_id": message.thread_id, "user_id": message.user_id})
            return PlatformResponse(
                content=f"Error: {str(e)}",
                thread_id=message.thread_id,
            )
    
    def get_app(self) -> FastAPI:
        """Get the FastAPI app instance."""
        if not self._app:
            self.create_app()
        return self._app
