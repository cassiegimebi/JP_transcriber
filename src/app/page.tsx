'use client';

import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);

  useEffect(() => {
    const savedKey = localStorage.getItem('GROQ_API_KEY');
    if (savedKey) {
      setApiKey(savedKey);
      setTempKeyInput(savedKey);
      setIsKeySaved(true);
    }
  }, []);

  const saveApiKey = () => {
    if (!tempKeyInput) return;
    setApiKey(tempKeyInput);
    localStorage.setItem('GROQ_API_KEY', tempKeyInput);
    setIsKeySaved(true);
  };

  const startRecording = async () => {
    if (!isKeySaved) {
      alert("Please save your Groq API Key first!");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        handleAudioUpload(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setStatus('Recording...');
      setTranscript('');
      setAnalysis(null);
    } catch (err) {
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isKeySaved) {
      alert("Please save your Groq API Key first!");
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      setTranscript('');
      setAnalysis(null);
      handleAudioUpload(file);
    }
  };

  const handleAudioUpload = async (blob: Blob) => {
    setIsLoading(true);
    setStatus('Transcribing...');

    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'ja');
      formData.append('response_format', 'json');

      const transRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData,
      });

      if (!transRes.ok) {
        const errText = await transRes.text();
        throw new Error(`Transcription failed (${transRes.status}): ${errText}`);
      }
      const transData = await transRes.json();
      setTranscript(transData.text);
      
      setStatus('Analyzing...');
      const prompt = `
You are an expert Japanese language teacher. 
I am going to provide you with a raw Japanese transcription. 
I want you to analyze it and provide a JSON response with the following format EXACTLY:
{
  "translation": "An English translation of the text",
  "summary_ja": "A brief summary of the text in Japanese",
  "furigana_text": "The original Japanese text, but with kanji formatted as [Kanji](furigana) so I can read it.",
  "vocabulary": [
    { "word": "word in kanji/kana", "reading": "kana reading", "meaning": "english meaning" }
  ]
}

Only return valid JSON. Do not include markdown formatting like \`\`\`json. 

Text to analyze:
${transData.text}`;

      const analyzeRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
      });

      if (!analyzeRes.ok) {
        const errText = await analyzeRes.text();
        throw new Error(`Analysis failed (${analyzeRes.status}): ${errText}`);
      }
      const analyzeData = await analyzeRes.json();
      const resultText = analyzeData.choices[0].message.content.trim();
      
      let parsedResult;
      try {
        parsedResult = JSON.parse(resultText);
      } catch (e) {
        try {
          const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedResult = JSON.parse(cleaned);
        } catch (parseError: any) {
          throw new Error(`Failed to parse AI response as JSON. Response was: ${resultText.slice(0, 100)}...`);
        }
      }

      setAnalysis(parsedResult);
      setStatus('');
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFurigana = (text: string) => {
    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        return (
          <ruby key={i} className="mx-[1px] text-[15px] font-bold text-[var(--text-primary)]">
            {match[1]}<rt className="text-[9px] font-normal text-[var(--text-secondary)]">{match[2]}</rt>
          </ruby>
        );
      }
      return <span key={i} className="text-[15px] font-bold text-[var(--text-primary)]">{part}</span>;
    });
  };

  const downloadTranscript = () => {
    if (!transcript) return;
    
    let content = `# Japanese Transcript\n\n## Original Text\n${transcript}\n\n`;
    if (analysis) {
      if (analysis.summary_ja) {
        content += `## Summary (Japanese)\n${analysis.summary_ja}\n\n`;
      }
      content += `## English Translation\n${analysis.translation}\n\n`;
      content += `## Reading\n${analysis.furigana_text}\n\n`;
      content += `## Vocabulary\n\n`;
      content += `| Word | Reading | Meaning |\n`;
      content += `| --- | --- | --- |\n`;
      analysis.vocabulary.forEach((v: any) => {
        content += `| ${v.word} | ${v.reading} | ${v.meaning} |\n`;
      });
      content += `\n`;
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VoiceNote_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pt-20 pb-32 px-6 sm:px-12 max-w-3xl mx-auto flex flex-col items-center text-center w-full">
      
      {/* Title & Description */}
      <h1 className="text-[32px] sm:text-[40px] font-bold mb-4 tracking-tighter">日本語 Transcriber</h1>
      <p className="text-[14px] text-[var(--text-secondary)] max-w-[480px] leading-relaxed mb-10">
        A minimalist tool to transcribe spoken Japanese audio, translate it to English, and automatically extract vocabulary and furigana readings.
      </p>

      {/* API Key Property */}
      <div className="w-full flex flex-col items-center mb-10 bg-[var(--input-bg)] border border-[var(--divider)] rounded-xl p-6 max-w-[440px]">
        <div className="text-[12px] font-bold uppercase tracking-widest mb-3">API Configuration</div>
        {!isKeySaved ? (
          <>
            <p className="text-[12px] text-[var(--text-secondary)] mb-4 text-center leading-relaxed">
              This tool uses the <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline hover:text-[var(--text-primary)]">Groq API</a> for blazing fast audio processing. <br/>Keys are stored safely in your browser.
            </p>
            <div className="flex items-center justify-center gap-2 w-full">
              <div className="input-wrapper flex-1">
                <input 
                  type="password"
                  value={tempKeyInput}
                  onChange={(e) => setTempKeyInput(e.target.value)}
                  placeholder="gsk_..."
                  className="notion-input text-center"
                />
              </div>
              <button onClick={saveApiKey} className="notion-btn notion-btn-primary">Save</button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
             <div className="text-[13px] text-[var(--text-secondary)]">Key is currently active.</div>
             <button onClick={() => setIsKeySaved(false)} className="text-[11px] text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]">Change Key</button>
          </div>
        )}
      </div>
        
      <hr className="w-32 mx-auto" />

      {/* Toolbar / Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 mt-4 w-full">
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading || !isKeySaved}
          className={`notion-btn ${isRecording ? 'notion-btn-danger' : ''}`}
        >
          {isRecording ? "STOP RECORDING" : "START RECORDING"}
        </button>

        <label className={`notion-btn cursor-pointer ${(isLoading || !isKeySaved) ? 'opacity-50 pointer-events-none' : ''}`}>
          UPLOAD AUDIO
          <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} disabled={isLoading || !isKeySaved} />
        </label>

        {analysis && (
          <button onClick={downloadTranscript} className="notion-btn">
            EXPORT NOTES
          </button>
        )}
      </div>

      {/* Status Message (Only show if error or not loading) */}
      {status && !isLoading && (
        <div className={`flex items-center justify-center gap-3 text-[12px] mb-8 uppercase tracking-widest ${status.startsWith('Error') ? 'text-red-500 max-w-2xl text-center normal-case' : 'text-[var(--text-secondary)]'}`}>
          {status}
        </div>
      )}

      {/* Loading Animation (Moving Wheel) */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-6 mb-12 mt-4 py-10 w-full border border-[var(--divider)] bg-[var(--input-bg)] rounded-xl">
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-[var(--divider)] rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-[12px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">
            {status}
          </div>
        </div>
      )}

      {/* Content Area */}
      {transcript && !isLoading && (
        <div className="w-full flex flex-col gap-12 mt-8 text-left">
          
          <section className="flex flex-col items-center">
            <h2 className="text-[12px] text-[var(--text-secondary)] uppercase tracking-widest mb-4">Transcript</h2>
            <p className="text-[15px] text-[var(--text-primary)] leading-loose max-w-2xl text-center">
              {transcript}
            </p>
          </section>

          {analysis && (
            <>
              <hr className="w-16 mx-auto border-t-2" />

              {/* Japanese Summary Section */}
              {analysis.summary_ja && (
                <section className="flex flex-col items-center">
                  <h2 className="text-[12px] text-[var(--text-secondary)] uppercase tracking-widest mb-4">Summary (JP)</h2>
                  <p className="text-[15px] text-[var(--text-primary)] leading-loose max-w-2xl text-center">
                    {analysis.summary_ja}
                  </p>
                </section>
              )}

              <hr className="w-16 mx-auto border-t-2" />

              <section className="flex flex-col items-center">
                <h2 className="text-[12px] text-[var(--text-secondary)] uppercase tracking-widest mb-6">Translation</h2>
                <div className="bg-[var(--input-bg)] p-6 w-full max-w-2xl mb-6 text-center border border-[var(--divider)] rounded-xl">
                  <div className="leading-[2.5]">
                    {renderFurigana(analysis.furigana_text)}
                  </div>
                </div>
                <p className="text-[14px] text-[var(--text-secondary)] italic max-w-xl text-center leading-relaxed">
                  "{analysis.translation}"
                </p>
              </section>

              <hr className="w-16 mx-auto border-t-2" />

              <section className="flex flex-col items-center w-full">
                <h2 className="text-[12px] text-[var(--text-secondary)] uppercase tracking-widest mb-6">Vocabulary</h2>
                <div className="w-full max-w-2xl text-[13px]">
                  {analysis.vocabulary.map((vocab: any, i: number) => (
                    <div key={i} className="flex flex-col sm:flex-row items-center py-4 border-b border-[var(--divider)] last:border-b-0 text-center sm:text-left gap-2 sm:gap-6">
                      <div className="sm:w-[40%] flex flex-col sm:flex-row items-center sm:justify-end gap-2 shrink-0">
                        <span className="font-bold text-[16px]">{vocab.word}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] px-2 py-0.5 border border-[var(--divider)] bg-[var(--input-bg)] rounded-md">{vocab.reading}</span>
                      </div>
                      <div className="sm:w-[60%] text-[var(--text-secondary)]">
                        {vocab.meaning}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}

    </div>
  );
}
