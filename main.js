// ร้องขอสิทธิ์การเข้าถึง Serial Port
const port = await navigator.serial.requestPort();

// เปิดพอร์ตที่ต้องการและระบุเรตเบาด์
await port.open({ baudRate: 9600 });

// ส่งข้อมูลผ่านพอร์ต
const encoder = new TextEncoder();
const dataToSend = "Hello, Serial!";
await port.write(encoder.encode(dataToSend));