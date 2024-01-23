const express = require("express");
const http = require("http");
const ytdl = require("ytdl-core");
const ffmpegStatic = require("ffmpeg-static");
const cp = require("child_process");
const ffmpeg = require("fluent-ffmpeg");
const cors = require("cors");
const bodyParser = require("body-parser");

ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const CorsOption = {
    origin: '*',
    credentials: true
};

app.use(cors(CorsOption));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.post('/', async (req, res) => {
    const { VideoURL, AudioURL } = req.body;
    const ffmpegProcess = cp.spawn(
        ffmpegStatic,
        [
            '-loglevel', '8',
            '-hide_banner',
            '-i', 'pipe:3',
            '-i', 'pipe:4',
            '-map', '0:a',
            '-map', '1:v',
            '-c:v', 'copy',
            '-c:a', 'copy',
            '-preset', 'ultrafast',
            '-f', 'matroska',
            'pipe:5',
        ],
        {
            windowsHide: true,
            stdio: ["inherit", "inherit", "inherit", "pipe", "pipe", "pipe"],
        }
    );

    AudioURL.pipe(ffmpegProcess.stdio[3]);
    VideoURL.pipe(ffmpegProcess.stdio[4]);
    ffmpegProcess.stdio[5].pipe(res)
    let currentDuration = 0;
    ffmpegProcess.stdio[5].on("data", (data) => {
        currentDuration += data.length
        if (data) {
            io.emit('data sent', { size: Math.floor((currentDuration / (1024 * 1024))) });
        }
    })
    ffmpegProcess.stdio[5].on("download start", () => {
        io.emit("end")
    })

})

const port=8000

server.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
});

