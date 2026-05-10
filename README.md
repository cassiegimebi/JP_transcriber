# 日本語 Transcriber (Japanese Learning App)

This is a Next.js application designed to instantly transcribe, translate, and analyze Japanese audio for language learners. It uses the blazing-fast Groq API for both Whisper (audio) and Llama 3 (analysis).

## Getting Started

Because this connects to a powerful AI model, you will need a free API key from Groq.

### 1. Get your Free API Key
1. Go to [https://console.groq.com/keys](https://console.groq.com/keys)
2. Create an account (it's completely free).
3. Click "Create API Key" and copy the string it gives you.

### 2. Configure the App
1. In this folder (`japanese-transcriber`), create a new file called `.env.local`
2. Paste your API key into the file exactly like this:
   ```
   GROQ_API_KEY=gsk_your_key_here...
   ```
3. Save the file.

### 3. Run the App
Open your terminal, ensure you are in this folder, and run:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You can now use the record button or upload audio files to test it out!
