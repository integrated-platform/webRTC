import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

declare module 'socket.io' {
    interface Socket {
      user: {
        username: string;
        // 필요에 따라 추가적인 속성 정의 가능
      };
    }
  }

// JWT 비밀 키 (환경 변수로 관리하는 것이 좋습니다)
const JWT_SECRET = 'your_secret_key';

// 사용자 인터페이스 정의
interface User {
  username: string;
  email: string;
  // 필요에 따라 추가적인 속성 정의 가능
}

// Express 및 Socket.IO 설정
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// JWT 검증 미들웨어 추가
io.use((socket: Socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided.'));
  }

  jwt.verify(token, JWT_SECRET, (err : any, decoded : any) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token.'));
    }

    // 유저 정보를 타입으로 명시
    socket.user = decoded as User; // 토큰에서 유저 정보 추출
    next(); // 인증 통과
  });
});

// 방에 입장하는 로직
io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.user.username}`);

  // 방에 참가
  socket.on('join-room', (room: string) => {
    socket.join(room);
    console.log(`${socket.user.username} joined room: ${room}`);
  });

  // 시그널 데이터 처리
  socket.on('signal', (signalData: { room: string; data: any }) => {
    console.log(`Signal data received for room ${signalData.room}`);
    socket.to(signalData.room).emit('signal', signalData.data);
  });

  // 연결 종료 처리
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.username}`);
  });
});

// Express 라우터 설정 (예: JWT 발급)
app.use(express.json()); // JSON 파싱 미들웨어 추가

app.post('/login', (req : any, res : any) => {
  const { username, password } = req.body;

  // 사용자 검증 로직 (예: DB에서 사용자 확인)
  if (username === 'test' && password === 'password') {
    // 사용자 인증 성공 시 JWT 발급
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }

  // 인증 실패
  return res.status(401).json({ error: 'Invalid credentials' });
});

// 서버 실행
server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
