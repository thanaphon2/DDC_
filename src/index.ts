import axios from "axios"
import dotenv from "dotenv"
import { format, parseISO} from 'date-fns'
import { api_url, axios_api } from "./API_URL/api_url"
import * as fs from 'fs'
import * as path from 'path'
import express,{Request, Response} from 'express'
import cors from 'cors'
import bodyParser from 'body-parser';
import cron from 'node-cron'
require('dotenv').config()

const date = new Date()
const date_str: any = format(date, 'yyyy-MM-dd')
const hours: number = date.getUTCHours()
const token: any = process.env.TOKEN_
const lat: any = process.env.LAT
const lot: any = process.env.LOT

let app = express()
app.use(express.json())
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
console.log("Hello worde")

import admin from 'firebase-admin';
const serviceAccountPath = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

app.post('/save-user', async (req: Request, res: Response) => {
  try {
    // if (!req.body) {
    //    res.status(400).json({ error: "ไม่มีข้อมูลส่งมา" });
    // }
    console.log(req.body)
    const { name, userId } = req.body;
    // if (!name || !userId) {
    //    res.status(400).json({ error: "กรุณาระบุ name และ userId" });
    // }

    const docRef = await db.collection('users').add({
      name: name,
      userId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      message: "บันทึกข้อมูลสำเร็จ",
      docId: docRef.id,
    });
  } catch (error) {
    console.error("Error adding document:", error);
    res.status(500).json({ error: "ไม่สามารถบันทึกข้อมูลได้" });
  }
});


app.get('/users', async (req, res) => {
  try {
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();

    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(users);

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' });
  }
});


app.post('/md', async (req: Request, res: Response) => {
  try{
    if(!req.body){
      res.status(401).json({Error: "เกิดข้อผิดพลาดไม่มีข้อมูลที่ส่งมา😑😑"})
    }
    const {time,temperature,humidity,SLP,rain,windspeed10m,winddirection10m,lowcloud,highcloud} = req.body
    const docRef = await db.collection('Clou').add({
      time: admin.firestore.FieldValue.serverTimestamp(),
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      SLP: parseFloat(SLP),
      rain: parseFloat(rain),
      winddirection10m: parseFloat(winddirection10m),
      lowcloud: parseFloat(lowcloud),
      highcloud: parseFloat(highcloud),
      windspeed10m: parseFloat(windspeed10m)
    });
    res.json({mas: "บันทึกสำเร็จ", docRef: docRef.id})
  }catch(err){
    console.error(err)
  }
})


app.get('/datamd', async (req: Request, res: Response) => {
  try{
    const db = admin.firestore();
    const Clou_showdata = await db.collection('Clou').get()
    const dataC = Clou_showdata.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ Data: dataC });  
  }catch(err){
    console.error("เกิดข้อผิดพลาด : ",err)
    res.status(500).json({Error: "เกิดข้อผิดพลาด",err})
  }
})


app.put('/dataeditmd/:id', async (req: Request, res: Response) => {
  try{
    const db = admin.firestore();
    const { id } = req.params
    const {time,temperature,humidity,SLP,rain,windspeed10m,winddirection10m,lowcloud,highcloud} = req.body
    const userDoc = await db.collection('Clou').doc(id).get();
    const upDatedata: any = {}
  if(!time || temperature || humidity || SLP || rain  || windspeed10m || winddirection10m || lowcloud || highcloud){
    upDatedata.time = time
    upDatedata.temperature = temperature
    upDatedata.humidity = humidity
    upDatedata.SLP = SLP
    upDatedata.rain = rain
    upDatedata.windspeed10m = windspeed10m
    upDatedata.winddirection10m = winddirection10m
    upDatedata.lowcloud = lowcloud
    upDatedata.highcloud = highcloud
  }
  if(!userDoc.id){
    res.status(502).json({ Error: "เกิดผิดพลาดไม่ไอดีหรือไอดีไม่ถูกต้องโปรดตรวจสอบไอดีของท่าน...😑😑😑"})
  }

  await db.collection('Clou').doc(id).update(upDatedata)
    res.json({ message: "อัปเดตข้อมูลเรียบร้อยแล้ว", id,  upDatedata });
  }catch(err){
    console.error("เกิดข้อผิดพลาด : ",err)
    res.status(500).json({Error: "เกิดข้อผิดพลาด",err})
  }
})

cron.schedule('0 * * * *', async () => {
  console.log("⏰ กำลังส่งข้อมูลทุกชั่วโมง")

  try {
    const URL_ = api_url(lat, lot, date_str, hours)
    const result = await axios_api(URL_, token, axios)
    const forecasts = result.data.WeatherForecasts;

    const t = forecasts.map((m: any) => m.forecasts.map(async(md: any) => {
      await axios.post('https://meteorologicaldepartment.vercel.app/md', {
        time: admin.firestore.FieldValue.serverTimestamp(),
        temperature: parseFloat(md.data.tc),
        humidity: parseFloat(md.data.rh),
        SLP: parseFloat(md.data.slp),
        rain: parseFloat(md.data.rain),
        windspeed10m: parseFloat(md.data.ws10m),
        winddirection10m: parseFloat(md.data.wd10m),
        lowcloud: parseFloat(md.data.cloudlow),
        highcloud: parseFloat(md.data.cloudhigh)
      })
    }))
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการส่งข้อมูล:", error)
  }
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})

// const URL_ = api_url(lat, lot, date_str, hours)

// const run = async () => {
//     const result = await axios_api(URL_, token, axios);
//     const forecasts = result.data.WeatherForecasts;
//     console.log(forecasts)

//     forecasts.forEach((m: any) => {
//         const location = m.location?.name || 'unknown';
//         saveForecastsToCSV(m.forecasts, location);
//     });
// };

// const saveForecastsToCSV = (forecasts: any[], locationName: string) => {
//     const now = new Date();
//     const thaiOffset = 7 * 60 * 60 * 1000;
//     const thaiDate = new Date(now.getTime() + thaiOffset).toISOString().slice(0, 10)
//     const fileName = `Bangna_${thaiDate}.csv`;
//     const filePath = path.join(__dirname, 'csv', fileName)

//     const fileExists = fs.existsSync(filePath);
//     const rows: string[] = [];

//     if (!fileExists) {
//         rows.push('date,time,maxTemp,minTemp,condition')
//     }

//     forecasts.forEach((f: any) => {
//         if (!f.time) {
//             console.warn("ไม่มี time:", f);
//             return;
//         }

//         const forecastTime = new Date(f.time);
//         if (isNaN(forecastTime.getTime())) {
//             console.warn("time ไม่ถูกต้อง:", f.time);
//             return;
//         }

//         const localTime = new Date(forecastTime.getTime());
//         const date = localTime.toISOString().split('T')[0];
//         const time = localTime.toISOString().split('T')[1].slice(0, 5);

//         const d = f.data || {};
//         rows.push(`${date},${time},${d.tc},${d.rh},${d.rain},${d.cloudlow},${d.cloudhigh},${d.wd10m},${d.ws10m}`);
//     });
//     console.log(rows)
//     fs.appendFileSync(filePath, rows.join('\n') + '\n', 'utf8');
//     console.log(`📄 บันทึกลงไฟล์ ${fileName} เรียบร้อย`);
// };

// setInterval(run, 60 * 60 * 1000); 