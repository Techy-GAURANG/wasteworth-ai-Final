let model;
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

async function start() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  model = await mobilenet.load();
}
start();

function capture() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
}

// Save Gemini key
function saveKey() {
  localStorage.setItem("gemini", document.getElementById("geminiKey").value);
  alert("Saved");
}

async function analyze() {
  document.getElementById("result").innerText = "Analyzing...";

  try {
    // 🔹 First try TensorFlow
    const preds = await model.classify(canvas);

    let label = preds[0].className.toLowerCase();
    let waste = "Unknown";

    if (label.includes("bottle")) waste = "Plastic";
    else if (label.includes("banana") || label.includes("food")) waste = "Organic";
    else if (label.includes("can")) waste = "Metal";

    // If confident enough → show result
    if (preds[0].probability > 0.7) {
      document.getElementById("result").innerText =
        `${waste} (${(preds[0].probability*100).toFixed(1)}%)`;
      return;
    }

    // 🔥 fallback to Gemini Vision
    await geminiVision();

  } catch (e) {
    await geminiVision();
  }
}

// 🔥 GEMINI VISION FALLBACK
async function geminiVision() {
  const key = localStorage.getItem("gemini");

  if (!key) {
    document.getElementById("result").innerText = "No API key";
    return;
  }

  const base64 = canvas.toDataURL().split(",")[1];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        contents: [{
          parts: [
            {text: "Classify this waste as plastic, organic, or metal"},
            {
              inline_data: {
                mime_type: "image/png",
                data: base64
              }
            }
          ]
        }]
      })
    }
  );

  const data = await res.json();
  document.getElementById("result").innerText =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "Error";
}
