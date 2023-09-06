const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const resetBtn = document.getElementById('resetBtn');
const baudRateSelect = document.getElementById('baudRateSelect');
const output = document.getElementById('frameOutput');

const sendReadInput = document.getElementById('sendReadInput');
const sendReadHolding = document.getElementById('sendReadHolding');
const sendWriteSingle = document.getElementById('sendWriteSingle');
const sendWriteMultiple = document.getElementById('sendWriteMultiple');
const configForm = document.getElementById('configForm');
const loadConfigButton = document.getElementById('loadConfigButton');
const saveNetworkButton = document.getElementById('saveNetwork');
const loadNetworkButton = document.getElementById('loadNetwork');
const saveWifi = document.getElementById('saveWifi');
const loadWifi = document.getElementById('loadWifi');

let onloadConfig = false;
let onloadNetwork = false;


let port;


function updateDataTable(registerData) {
    const dataTable = document.getElementById('dataTable');
    const startAddress = parseInt(document.getElementById('startAddress').value);

    // Clear existing rows
    while (dataTable.rows.length > 1) {
        dataTable.deleteRow(1);
    }

    const numRegisters = registerData[2]; // Get the number of registers from Address 3

    // Add new rows for Data portion of the frame
    const updateButton = document.createElement('button');
    updateButton.textContent = 'Update All';

    for (let index = 0; index < numRegisters; index = index + 2) {
        const newRow = dataTable.insertRow(-1);
        const addressCell = newRow.insertCell(0);
        const valueCell = newRow.insertCell(1);
        const newValueCell = newRow.insertCell(2);

        const currentAddress = startAddress + index;
        const currentValue = (registerData[currentAddress + 3] << 8) | registerData[currentAddress + 4];

        addressCell.innerHTML = currentAddress;
        valueCell.innerHTML = currentValue;

        const inputElement = document.createElement('input');
        inputElement.type = 'number';
        inputElement.value = currentValue;
        newValueCell.appendChild(inputElement);
    }

    // Add update button event listener
    updateButton.addEventListener('click', () => {
        const newValueElements = dataTable.querySelectorAll('input[type="number"]');
        newValueElements.forEach((inputElement, index) => {
            const newValue = parseInt(inputElement.value);
            if (!isNaN(newValue)) {
                const currentAddress = startAddress + index;
                registerData[currentAddress + 3] = (newValue >> 8) & 0xFF; // High byte
                registerData[currentAddress + 4] = newValue & 0xFF; // Low byte
                // const currentValue = (registerData[currentAddress + 3] << 8) | registerData[currentAddress + 4];

                // Update the displayed value
                const valueCell = inputElement.parentElement.previousElementSibling;
                valueCell.innerHTML = newValue;
            }
        });

        // You can add logic here to send the updated values to your device
    });

    const buttonCell = dataTable.insertRow(-1).insertCell(0);
    buttonCell.colSpan = 3;
    buttonCell.appendChild(updateButton);
}

function createModbusRTUFrameForIP(slaveId, startAddress, ipAddress) {
    // Assuming ipAddress is a string in the format "xxx.xxx.xxx.xxx"
    const ipParts = ipAddress.split('.').map(part => parseInt(part));

    const frame = new Uint8Array(12); // Modify the length accordingly

    // Populate the frame with necessary data
    frame[0] = slaveId; // Set the slave ID
    frame[1] = 6; // Function code for writing a single register
    frame[2] = (startAddress >> 8) & 0xFF;
    frame[3] = startAddress & 0xFF;
    frame[4] = ipParts[0]; // Value for the high byte of the IP address (1st octet)
    frame[5] = ipParts[1]; // Value for the low byte of the IP address (2nd octet)
    frame[6] = ipParts[2]; // Value for the high byte of the IP address (3rd octet)
    frame[7] = ipParts[3]; // Value for the low byte of the IP address (4th octet)

    // Calculate CRC and append it to the frame
    const crc = calculateCRC(frame, frame.length - 2);
    frame[frame.length - 2] = crc & 0xFF; // Low byte of CRC
    frame[frame.length - 1] = (crc >> 8) & 0xFF; // High byte of CRC

    return frame;
}

function uint8ArrayToString(uint8Array) {
    let string = '';
    for (let i = 0; i < uint8Array.length; i++) {
        console.log('uint8Array', uint8Array[i]);
        if (uint8Array[i] > 0 && uint8Array[i] < 256) 
        {
            string += String.fromCharCode(uint8Array[i]);
        }
            
    }
    return string;
}



function convertToIPAddress(byteArray) {
    if (byteArray.length !== 4) {
        throw new Error('Byte array must contain exactly 4 elements.');
    }

    return byteArray.join('.');
}

function updateConfiguration(frame) {


    let modbusDeviceIP = [];
    let moduleIPAddress = [];
    let dnsAddress = [];
    let gatewayAddress = [];
    let subnetAddress = [];
    let protocolBIT = [];



    const dataArrays = [modbusDeviceIP, moduleIPAddress, dnsAddress, gatewayAddress, subnetAddress, protocolBIT];
    console.log('dataArrays.length', dataArrays.length, frame);
    const startIndexes = [3, 11, 19, 27, 35, 43];
    for (let i = 0; i < dataArrays.length; i++) {

        for (let j = 0; j < 4; j++) {
            dataArrays[i][j] = (frame[startIndexes[i] + j * 2] << 8) | frame[startIndexes[i] + j * 2 + 1];
            console.log('dataArrays[i][j]:', startIndexes[i], dataArrays[i][j]);
        }
    }

    console.log('Modbus Device IP:', modbusDeviceIP);
    console.log('Module IP Address:', moduleIPAddress);
    console.log('DNS Address:', dnsAddress);
    console.log('Gateway Address:', gatewayAddress);
    console.log('Subnet Address:', subnetAddress);
    console.log('protocolBIT:', protocolBIT);


    document.getElementById('ModbusDeviceIP').value     = convertToIPAddress(modbusDeviceIP);
    document.getElementById('moduleIPAddress').value    = convertToIPAddress(moduleIPAddress);
    document.getElementById('dnsAddress').value         = convertToIPAddress(dnsAddress);
    document.getElementById('gatewayAddress').value     = convertToIPAddress(gatewayAddress);
    document.getElementById('subnetAddress').value      = convertToIPAddress(subnetAddress);

    document.getElementById('protocol').value = protocolBIT[0];
    document.getElementById('DBNum').value = protocolBIT[1];
    document.getElementById('Rack_PLC').value = protocolBIT[2];
    document.getElementById('Slot_PLC').value = protocolBIT[3];




    // ... อัปเดตข้อมูล IP address อื่น ๆ ในฟอร์ม ...
}

function updateConfigurationNetwork(frame) {
    let ipAddress = [];
    let subnet = [];
    let gateway = [];
    let config = [];
    let ssid = [];
    let password = [];
    const dataArrays = [ipAddress, subnet, gateway, config, ssid, password];

    const startIndexes = [3, 11, 19, 27, 31, 51];
    console.log('dataArrays.length', dataArrays.length, frame);

    for (let i = 0; i < dataArrays.length; i++) {

        if (startIndexes[i] < 30) {
            for (let j = 0; j < 4; j++) {
                dataArrays[i][j] = (frame[startIndexes[i] + j * 2] << 8) | frame[startIndexes[i] + j * 2 + 1];
                console.log('dataArrays[i][j]:', startIndexes[i], dataArrays[i][j]);
            }
        }else {
            for (let j = 0; j < 20; j++) {
                dataArrays[i][j] = (frame[startIndexes[i] + j * 2] << 8) | frame[startIndexes[i] + j * 2 + 1];
                console.log('dataArrays[i][j]:', startIndexes[i], dataArrays[i][j]);
            }
        }
    }

    console.log('IP Address:', ipAddress);
    console.log('Subnett:', subnet);
    console.log('gateway:', gateway);
    console.log('ssid:', ssid);
    console.log('password:', password);
    /*  */
    document.getElementById('ipAddress').value = convertToIPAddress(ipAddress);
    document.getElementById('subnetMask').value = convertToIPAddress(subnet);
    document.getElementById('gateway').value = convertToIPAddress(gateway);

    if (config[0] === 0) 
    {
        document.getElementById("networkType").value =  'static' ;
    }
    else if (config[0] === 1) 
    {
        document.getElementById("networkType").value = 'dhcp';
    }
    else if (config[0] === 2) 
    {
        document.getElementById("networkType").value = 'wifi';
    }
 
    document.getElementById('ssid').value = uint8ArrayToString(ssid);
    document.getElementById('password').value = uint8ArrayToString(password);

}   


connectBtn.addEventListener('click', async () => {
    try {
        const selectedBaudRate = parseInt(baudRateSelect.value);
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: selectedBaudRate });
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        resetBtn.disabled = false;
        output.textContent += `Connected to Serial Port with Baud Rate: ${selectedBaudRate}\n`;
        readData();
    } catch (error) {
        console.error('Error connecting to Serial Port:', error);
    }
});

// สร้างฟังก์ชั่นสำหรับคำนวณ CRC16
function crc16(buffer) {
    let crc = 0xFFFF;
    for (let i = 0; i < buffer.length; i++) {
        crc ^= buffer[i];
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x0001) !== 0) {
                crc >>= 1;
                crc ^= 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

// สร้างฟังก์ชั่นสำหรับคำนวณ CRC16
function crc16Write(buffer) {
    let crc = 0xFFFF;
    for (let i = 0; i < buffer.length - 2; i++) {
        crc ^= buffer[i];
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x0001) !== 0) {
                crc >>= 1;
                crc ^= 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

function createModbusRTUFrameWrite(slaveId, startAddress, values) {
    const numRegisters = values.length;
    console.log("createModbusRTUFrame numRegisters", numRegisters);
    const frameLength = 9 + numRegisters * 2; // Length of frame excluding CRC

    const frame = new Uint8Array(frameLength);
    frame[0] = slaveId;
    frame[1] = 0x10;
    frame[2] = (startAddress >> 8) & 0xFF;
    frame[3] = startAddress & 0xFF;
    frame[4] = (numRegisters >> 8) & 0xFF;
    frame[5] = numRegisters & 0xFF;
    frame[6] = numRegisters * 2; // Byte count

    for (let i = 0; i < numRegisters; i++) {
        const value = values[i];
        const index = 7 + i * 2;
        frame[index] = (value >> 8) & 0xFF;
        frame[index + 1] = value & 0xFF;
    }
    //console.log(frame);
    const crc = crc16Write(frame);
    frame[frameLength - 2] = crc & 0xFF;
    frame[frameLength - 1] = (crc >> 8) & 0xFF;

    return frame;
}



function createModbusRTUFrame(slaveAddress, fucntion, startRegister, numRegisters) {
    
    const frame = new Uint8Array(8);
    frame[0] = slaveAddress;      // Slave Address
    frame[1] = fucntion;              // Function Code for Read Input Register
    frame[2] = startRegister >> 8; // High Byte of Start Register
    frame[3] = startRegister & 0xFF; // Low Byte of Start Register
    frame[4] = numRegisters >> 8;  // High Byte of Number of Registers
    frame[5] = numRegisters & 0xFF;  // Low Byte of Number of Registers

    const crc = crc16(frame.subarray(0, 6)); // Calculate CRC16
    frame[6] = crc & 0xFF; // Low Byte of CRC
    frame[7] = crc >> 8;   // High Byte of CRC

    return frame;
}
resetBtn.addEventListener('click', async () => {

    if (port) {

        const writer = port.writable.getWriter();

        const slaveId = parseInt(document.getElementById('slaveId').value);
      
        startAddress = 99;
        let frame = createModbusRTUFrameWrite(slaveId, startAddress, [255]);
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ

        // input.value = '';
    
        const encoder = new TextEncoder();

        // writer.write("A long message that will take...");
        const data = encoder.encode("reboot iot edge v3..." + '\n');

        output.textContent += new TextDecoder().decode(data);
        

        await port.writable.getWriter().close();
        await port.close();
       
        port = null;
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        resetBtn.disable = true;
          
        
        output.textContent += 'Disconnected from Serial Port.\n';
    }
});

disconnectBtn.addEventListener('click', async () => {

    if (port) {

        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();

        // writer.write("A long message that will take...");
        const data = encoder.encode("A long message that will take..." + '\n');

        output.textContent += new TextDecoder().decode(data);

        await port.writable.getWriter().close();
        await port.close();
        // await port.writable.cancel();
        // await writer.close();
        await port.readable.getReader().close();

        port = null;
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        resetBtn.disable = true;
        output.textContent += 'Disconnected from Serial Port.\n';
    }
});

async function readData() {
    while (port && port.readable) {
        const reader = port.readable.getReader();
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                displayFrameBytesRev(value);
            }
        } catch (error) {
            console.error('Error reading data:', error);
        } finally {
            reader.releaseLock();
        }
    }
}

// สร้างฟังก์ชั่นสำหรับแสดงข้อมูลแต่ละ byte ใน frame
function displayFrameBytesSend(frame) {
    let frameStr = "\n Frame send : ";
    for (let i = 0; i < frame.length; i++) {
        frameStr += frame[i].toString(16).padStart(2, '0') + " ";
    }
    console.log(frameStr);
    output.textContent += frameStr;
    // ตั้งค่า scrollbar ให้เลื่อนมาที่ล่างสุด
    output.scrollTop = output.scrollHeight;
}

function displayFrameBytesRev(frame) {
    let frameStr = "\n Frame rev : ";
    for (let i = 0; i < frame.length; i++) {
        frameStr += frame[i].toString(16).padStart(2, '0') + " ";
    }
    // console.log(frameStr);
    output.textContent += frameStr;
    // ตั้งค่า scrollbar ให้เลื่อนมาที่ล่างสุด
    output.scrollTop = output.scrollHeight;
    if (onloadConfig) {
        updateConfiguration(frame);
        onloadConfig = false;
    }

    if (onloadNetwork) {
        updateConfigurationNetwork(frame);
        onloadNetwork = false;
    }
    updateDataTable(frame);


}


sendReadInput.addEventListener('click', async () => {
    if (port) {
        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        const fucntion = 0x04;
        const slaveId = parseInt(document.getElementById('slaveId').value);
        const startAddress = parseInt(document.getElementById('startAddress').value);
        const numRegisters = parseInt(document.getElementById('numRegisters').value);


        const frame = createModbusRTUFrame(slaveId, fucntion, startAddress, numRegisters);
        console.log('frame', frame);
        displayFrameBytesSend(frame);


        await writer.write(frame);
        writer.releaseLock();

        //  output.value = '';
    }
});

// Calculate CRC (Cyclic Redundancy Check) for Modbus RTU
function calculateCRC(buffer) {
    let crc = 0xFFFF;
    for (const byte of buffer) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x0001) {
                crc >>= 1;
                crc ^= 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}


sendReadHolding.addEventListener('click', async () => {
    if (port) {
        const writer = port.writable.getWriter();

        const fucntion = 0x03;
        const slaveId = parseInt(document.getElementById('slaveId').value);
        const startAddress = parseInt(document.getElementById('startAddress').value);
        const numRegisters = parseInt(document.getElementById('numRegisters').value);


        const frame = createModbusRTUFrame(slaveId, fucntion, startAddress, numRegisters);
        console.log('frame', frame);
        displayFrameBytesSend(frame);


        await writer.write(frame);
        writer.releaseLock();

        // input.value = '';
    }
});


sendWriteMultiple.addEventListener('click', async () => {
    if (port) {
        const writer = port.writable.getWriter();


        const slaveId = parseInt(document.getElementById('slaveId').value);
        const startAddress = parseInt(document.getElementById('startAddress').value);

        const values = [];
        // Loop through the table rows and extract values from newValueCell
        const dataTable = document.getElementById('dataTable');
        for (let row = 1; row < dataTable.rows.length - 1; row++) {
            const newValueCell = dataTable.rows[row].cells[2];
            console.log(newValueCell);
            const newValue = parseInt(newValueCell.firstChild.value);


            values.push(newValue);
        }


        const frame = createModbusRTUFrameWrite(slaveId, startAddress, values);
        // const frame = createModbusRTUFrame(slaveId, startAddress, values, numRegisters);

        console.log('frame', frame);
        displayFrameBytesSend(frame);


        await writer.write(frame);
        writer.releaseLock();

        // input.value = '';
    }
});


loadConfigButton.addEventListener('click', async () => {
    // ทำงานเมื่อปุ่ม "Load Configuration" ถูกคลิก
    // เช่น อ่านค่าจากการตั้งค่าที่บันทึกและแสดงในฟอร์ม

    console.log("loadConfigButton");
    if (port) {
        const writer = port.writable.getWriter();

        const fucntion = 0x03;
        const slaveId = parseInt(document.getElementById('slaveId').value);
        const startAddress = 0;
        const numRegisters = 48;


        const frame = createModbusRTUFrame(slaveId, fucntion, startAddress, numRegisters);
        console.log('frame', frame);
        displayFrameBytesSend(frame);


        await writer.write(frame);
        writer.releaseLock();
        onloadConfig = true;
        // input.value = '';  
    }



});

configForm.addEventListener('submit', async () => {
    event.preventDefault(); // Prevent the form from submitting normally

    const ModbusDeviceIP = document.getElementById('ModbusDeviceIP').value;
    const moduleIPAddress = document.getElementById('moduleIPAddress').value;
    const dnsAddress = document.getElementById('dnsAddress').value;
    const gatewayAddress = document.getElementById('gatewayAddress').value;
    const subnetAddress = document.getElementById('subnetAddress').value;
    const protocol = document.getElementById('protocol').value;
    const DBNum = document.getElementById('DBNum').value;
    const Rack_PLC = document.getElementById('Rack_PLC').value;
    const Slot_PLC = document.getElementById('Slot_PLC').value;

    if (port) {
        const writer = port.writable.getWriter();


        const slaveId = parseInt(document.getElementById('slaveId').value);
        let startAddress = parseInt(document.getElementById('startAddress').value);

        let values = [];
        // Loop through the table rows and extract values from newValueCell



        startAddress = 0;
        let frame = createModbusRTUFrameWrite(slaveId, startAddress, ModbusDeviceIP.match(/\d+/g));
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ

        startAddress = startAddress + 4;
        frame = createModbusRTUFrameWrite(slaveId, startAddress, moduleIPAddress.match(/\d+/g));
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ

        startAddress = startAddress + 4;
        frame = createModbusRTUFrameWrite(slaveId, startAddress, dnsAddress.match(/\d+/g));
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ

        startAddress = startAddress + 4;
        frame = createModbusRTUFrameWrite(slaveId, startAddress, gatewayAddress.match(/\d+/g));
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ

        startAddress = startAddress + 4;
        frame = createModbusRTUFrameWrite(slaveId, startAddress, subnetAddress.match(/\d+/g));
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ

        values = [protocol, DBNum, Rack_PLC, Slot_PLC];
        console.log(values);
        startAddress = startAddress + 4;
        frame = createModbusRTUFrameWrite(slaveId, startAddress, values);
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 100)); // รอสักครู่ก่อนส่งต่อ


        writer.releaseLock();

        // input.value = '';
    }
});


function openTab(event, tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = "none";
    }
    document.getElementById(tabName).style.display = "block";
}

function toggleConfigFields() {
    const networkType = document.getElementById('networkType').value;
    const staticConfig = document.getElementById('staticConfig');
    const dhcpConfig = document.getElementById('dhcpConfig');
    const wifiConfig = document.getElementById('wifiConfig');

    if (networkType === 'static') {
        staticConfig.style.display = 'block';
        dhcpConfig.style.display = 'none';
        wifiConfig.style.display = 'none';
    } else if (networkType === 'dhcp') {
        staticConfig.style.display = 'none';
        dhcpConfig.style.display = 'block';
        wifiConfig.style.display = 'none';
    } else if (networkType === 'wifi') {
        staticConfig.style.display = 'none';
        dhcpConfig.style.display = 'none';
        wifiConfig.style.display = 'block';    
    }
}





saveNetworkButton.addEventListener('click', async () => {

    event.preventDefault(); // Prevent the form from submitting normally

    const ipAddress = document.getElementById('ipAddress').value;
    const subnetMask = document.getElementById('subnetMask').value;
    const gateway = document.getElementById('gateway').value;
    let networkType = document.getElementById('networkType').value;
    let networkTypeValue = 0;
    const ssid = document.getElementById('ssid').value;
    const password = document.getElementById('password').value;
    const wifiStatusText = document.getElementById('wifiStatusText');



   
    if (networkType === "static") 
    {
        networkTypeValue = 0;
    } else if (networkType === "dhcp") 
    {
        networkTypeValue = 1;
    } else if (networkType === "wifi") 
    {
        networkTypeValue = 2;
    }
    console.log("networkType", networkTypeValue);

    if (port) {
        const writer = port.writable.getWriter();


        const slaveId = parseInt(document.getElementById('slaveId').value);
        let startAddress = parseInt(document.getElementById('startAddress').value);
    
        let values = [];
        // Loop through the table rows and extract values from newValueCell

        const encoder = new TextEncoder();
        const ssidData = encoder.encode(ssid);
        const passwordData = encoder.encode(password);
 
        //ssidData.set()
      
        const paddedSsidData = new Uint8Array(20);
        const paddedPasswordData = new Uint8Array(20);
        console.log("ssidData", ssidData);
        console.log("passwordData", passwordData);
        paddedSsidData.set(ssidData);
        paddedPasswordData.set(passwordData);
        console.log('paddedSsidData', paddedSsidData);
        console.log('paddedPasswordData', paddedPasswordData);

        startAddress = 24;
        let frame = createModbusRTUFrameWrite(slaveId, startAddress, ipAddress.match(/\d+/g));
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ

        startAddress = startAddress + 4;
        frame = createModbusRTUFrameWrite(slaveId, startAddress, subnetMask.match(/\d+/g));
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ

        startAddress = startAddress + 4;
        frame = createModbusRTUFrameWrite(slaveId, startAddress, gateway.match(/\d+/g));
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ

        values = [networkTypeValue, 0, 0, 0];
        console.log(values);
        startAddress = startAddress + 4;
        frame = createModbusRTUFrameWrite(slaveId, startAddress, values);
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ

        
       
        startAddress = startAddress + 4;

        console.log("ssidData", paddedSsidData);
        frame = createModbusRTUFrameWrite(slaveId, startAddress, paddedSsidData);
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ


        startAddress = startAddress + 20;
        console.log("passwordData", paddedPasswordData);
        frame = createModbusRTUFrameWrite(slaveId, startAddress, paddedPasswordData);
        displayFrameBytesSend(frame);
        await writer.write(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // รอสักครู่ก่อนส่งต่อ
        

        writer.releaseLock();

        // input.value = '';
    }




});


loadNetworkButton.addEventListener('click', async () => {
    // ทำงานเมื่อปุ่ม "Load Configuration" ถูกคลิก
    // เช่น อ่านค่าจากการตั้งค่าที่บันทึกและแสดงในฟอร์ม

    console.log("loadNetworkButton");
    event.preventDefault(); // Prevent the form from submitting normally

    /**/

    if (port) {
        const writer = port.writable.getWriter();

        const fucntion = 0x03;
        const slaveId = parseInt(document.getElementById('slaveId').value);
        const startAddress = 24;
        const numRegisters = 80;


        const frame = createModbusRTUFrame(slaveId, fucntion, startAddress, numRegisters);
        console.log('frame', frame);
        displayFrameBytesSend(frame);


        await writer.write(frame);
        writer.releaseLock();
       
        onloadNetwork = true;
        // input.value = '';  
    }



});


