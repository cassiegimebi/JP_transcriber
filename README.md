# 日本語 Transcriber (JP Transcriber)

A minimalist, high-performance web application designed to instantly transcribe spoken Japanese audio, translate it to English, and automatically extract vocabulary and summary data. 

Built for language learners, this app runs entirely in your browser and connects directly to the blazing-fast **Groq API** (using Whisper for audio and Llama 3 for text analysis).

## 🚀 Live Demo
You can use the live version hosted on GitHub Pages:
[https://cassiegimebi.github.io/JP_transcriber/](https://cassiegimebi.github.io/JP_transcriber/)

## ✨ Features
- **Instant Transcription**: Record or upload Japanese audio and get text in seconds.
- **Furigana Generation**: Automatically adds reading guides above kanji.
- **AI Analysis**: Generates an English translation and a Japanese summary.
- **Vocabulary Extraction**: Creates a list of key words with readings and meanings.
- **Clean Export**: Download your notes as a structured Markdown file.

## 🔑 How to Use (Bring Your Own Key)
To keep this app free and fast, it uses a "Bring Your Own Key" model. Your key is stored safely in your browser's local storage and never sent to any server except Groq.

1. Get a free API key from the [Groq Console](https://console.groq.com/keys).
2. Open the app and paste your key into the **API Configuration** box.
3. Click **Save** and start transcribing!

## 🛠 Tech Stack
- **Framework**: Next.js (Static Export)
- **Styling**: Tailwind CSS
- **Font**: Comfortaa
- **APIs**: Groq (Whisper-large-v3-turbo & Llama-3-70b)
