const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 提供静态文件
app.use(express.static(path.join(__dirname, 'dist')));

// 创建WebSocket服务器
const wss = new WebSocket.Server({ 
  server,
  path: '/ws/chat'
});

// 存储在线用户和连接
const connectedClients = new Map();
const onlineUsers = new Map();

// 广播消息给所有客户端
function broadcast(message, excludeClient = null) {
  const data = typeof message === 'string' ? message : JSON.stringify(message);
  
  connectedClients.forEach((client, ws) => {
    if (ws !== excludeClient && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

wss.on('connection', (ws, req) => {
  console.log('新的WebSocket连接建立');
  
  // 生成客户端ID
  const clientId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  connectedClients.set(ws, { id: clientId });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('收到消息:', data);
      
      const clientInfo = connectedClients.get(ws);
      
      switch (data.type) {
        case 'user_join':
          // 用户加入聊天室
          clientInfo.userId = data.user_id;
          clientInfo.userName = data.user_name;
          
          onlineUsers.set(data.user_id, {
            id: data.user_id,
            name: data.user_name,
            joinTime: data.timestamp
          });
          
          // 广播用户加入消息
          broadcast({
            type: 'user_join',
            user_id: data.user_id,
            user_name: data.user_name,
            timestamp: data.timestamp,
            online_count: onlineUsers.size
          });
          
          // 发送当前在线用户列表给新用户
          ws.send(JSON.stringify({
            type: 'online_users',
            users: Array.from(onlineUsers.values()),
            online_count: onlineUsers.size
          }));
          
          console.log(`用户 ${data.user_name} 加入聊天室，当前在线: ${onlineUsers.size}`);
          break;
          
        case 'chat_message':
          // 聊天消息
          const chatMessage = {
            type: 'chat_message',
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: data.content,
            user_id: data.user_id,
            user_name: data.user_name,
            user_email: data.user_email,
            timestamp: data.timestamp || new Date().toISOString()
          };
          
          // 广播给所有客户端（除了发送者）
          broadcast(chatMessage, ws);
          
          // 同时发送回发送者（用于确认）
          ws.send(JSON.stringify({
            ...chatMessage,
            is_own: true
          }));
          
          console.log(`用户 ${data.user_name} 发送消息: ${data.content}`);
          break;
          
        case 'user_leave':
          // 用户离开
          if (clientInfo.userId) {
            onlineUsers.delete(clientInfo.userId);
            broadcast({
              type: 'user_leave',
              user_id: clientInfo.userId,
              user_name: clientInfo.userName,
              timestamp: data.timestamp,
              online_count: onlineUsers.size
            });
            console.log(`用户 ${clientInfo.userName} 离开聊天室，当前在线: ${onlineUsers.size}`);
          }
          break;
          
        default:
          console.log('未知消息类型:', data.type);
      }
      
    } catch (error) {
      console.error('解析消息失败:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '消息格式错误'
      }));
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log('WebSocket连接关闭:', code, reason.toString());
    
    const clientInfo = connectedClients.get(ws);
    if (clientInfo && clientInfo.userId) {
      // 用户离开
      onlineUsers.delete(clientInfo.userId);
      broadcast({
        type: 'user_leave',
        user_id: clientInfo.userId,
        user_name: clientInfo.userName,
        timestamp: new Date().toISOString(),
        online_count: onlineUsers.size
      });
      console.log(`用户 ${clientInfo.userName} 断开连接，当前在线: ${onlineUsers.size}`);
    }
    
    connectedClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'welcome',
    message: '欢迎使用实时聊天功能',
    timestamp: new Date().toISOString()
  }));
});

// 处理所有路由，返回index.html（用于SPA）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`WebSocket地址: ws://localhost:${PORT}/ws/chat`);
  console.log(`HTTP地址: http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('正在关闭服务器...');
  
  // 通知所有客户端服务器即将关闭
  broadcast({
    type: 'server_shutdown',
    message: '服务器即将关闭',
    timestamp: new Date().toISOString()
  });
  
  setTimeout(() => {
    wss.close(() => {
      console.log('WebSocket服务器已关闭');
      server.close(() => {
        console.log('HTTP服务器已关闭');
        process.exit(0);
      });
    });
  }, 1000);
});