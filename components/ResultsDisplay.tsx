import React, { useState, useEffect } from 'react';
import { FinalOutput } from '../types';
import { Icon } from './Icon';

interface ResultsDisplayProps {
  result: FinalOutput;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg mt-8 space-y-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-center text-indigo-400">Your Ad is Ready!</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-xl font-semibold text-white">Generated Video Ad</h3>
          <div className={`relative w-full overflow-hidden rounded-lg shadow-2xl ${result.aspect_ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}>
             <video src={result.veo_video_url} controls autoPlay loop muted playsInline className="w-full h-full object-cover">
                Your browser does not support the video tag.
             </video>
          </div>
          {result.voiceover_audio_url && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold text-white mb-2">Generated Voiceover</h4>
              <audio controls src={result.voiceover_audio_url} className="w-full">
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
        <div className="lg:col-span-2 space-y-4 bg-gray-900 p-4 rounded-md">
            <h3 className="text-xl font-semibold text-white">Ad Summary</h3>
            <div className="text-gray-300 space-y-3">
              <p><strong>Title:</strong> {result.ad_title}</p>
              <p><strong>Idea:</strong> {result.ad_idea}</p>
              <p><strong>Description:</strong> {result.ad_description}</p>
              <p><strong>CTA:</strong> {result.cta_line}</p>
              <div>
                <strong>Hashtags:</strong>
                <div className="flex flex-wrap gap-2 mt-1">
                    {result.hashtags.map((tag, index) => (
                        <span key={index} className="bg-gray-700 text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full">
                           #{tag}
                        </span>
                    ))}
                </div>
              </div>
              <p><strong>QC Notes:</strong> <span className="text-gray-400 italic">{result.qc_notes}</span></p>
            </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Structured JSON Output</h3>
        <div className="relative">
            <pre className="bg-gray-900 text-sm text-indigo-300 p-4 rounded-md overflow-x-auto">
                <code>{JSON.stringify(result, null, 2)}</code>
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              aria-label="Copy JSON"
            >
              {copied ? <Icon icon="check" className="w-5 h-5 text-green-400" /> : <Icon icon="clipboard" className="w-5 h-5" />}
            </button>
        </div>
      </div>
    </div>
  );
};