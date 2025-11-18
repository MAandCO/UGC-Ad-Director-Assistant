import React, { useState } from 'react';
import { ImageData } from '../types';
import { Icon } from './Icon';
import { ImageInput } from './InputForm';
import * as geminiService from '../services/geminiService';

const fileToBase64 = (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve({ base64, mimeType: file.type });
        };
        reader.onerror = error => reject(error);
    });
};

const dataUrlToImageData = (dataUrl: string): ImageData => {
    const parts = dataUrl.split(',');
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const base64 = parts[1];
    return { base64, mimeType };
}

export const ModelCreator: React.FC = () => {
    const [fashionPhoto, setFashionPhoto] = useState<File | null>(null);
    const [headshot, setHeadshot] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ imageUrl: string; prompt: string } | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [promptHistory, setPromptHistory] = useState<string[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fashionPhoto || !headshot) {
            alert("Please upload both a fashion photo and a headshot.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        setPromptHistory([]);
        try {
            const fashionPhotoData = await fileToBase64(fashionPhoto);
            const headshotData = await fileToBase64(headshot);
            const generationResult = await geminiService.generateModelImage(fashionPhotoData, headshotData);
            setResult(generationResult);
            setPromptHistory([generationResult.prompt]);
        } catch (e: any) {
            setError(e.message || "Failed to generate model image.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editPrompt.trim() || !result) return;
        
        setIsEditing(true);
        setError(null);
        try {
            const baseImageData = dataUrlToImageData(result.imageUrl);
            const newImageUrl = await geminiService.editModelImage(baseImageData, editPrompt);
            setResult(prev => ({...prev!, imageUrl: newImageUrl }));
            setPromptHistory(prev => [...prev, editPrompt]);
            setEditPrompt('');
        } catch (e: any) {
            setError(e.message || "Failed to edit model image.");
        } finally {
            setIsEditing(false);
        }
    }

    return (
        <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl shadow-purple-900/20 mt-10">
            <h2 className="text-2xl font-bold text-center text-purple-400 mb-2">Virtual Model Creator</h2>
             <p className="text-center text-gray-400 mb-6">Create a new model image using a style reference and your own headshot.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ImageInput id="fashionPhoto" label="Fashion/Model Photo" onChange={setFashionPhoto} />
                    <ImageInput id="headshot" label="User's Headshot" onChange={setHeadshot} />
                </div>
                <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 disabled:bg-purple-900 disabled:cursor-not-allowed">
                     {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                    ) : (
                        <>
                          <Icon icon="sparkles" className="w-5 h-5 mr-2" />
                          Generate Model Image
                        </>
                    )}
                </button>
            </form>
            
            {error && (
                <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-md" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span>{error}</span>
                </div>
            )}
            
            {result && (
                <div className="mt-8 pt-6 border-t border-gray-700 space-y-4 animate-fade-in">
                    <h3 className="text-xl font-semibold text-white">Generated Model</h3>
                    <div className="relative w-full max-w-md mx-auto">
                        <img src={result.imageUrl} alt="Generated Model" className="rounded-lg shadow-lg w-full" />
                         <a
                            href={result.imageUrl}
                            download="generated-model.png"
                            className="absolute bottom-4 right-4 flex items-center py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600/80 backdrop-blur-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500"
                        >
                            <Icon icon="download" className="w-5 h-5 mr-2" />
                            Download
                        </a>
                    </div>
                    <div className='bg-gray-900 p-4 rounded-md'>
                      <h4 className="text-md font-semibold text-gray-300 mb-2">Prompt History:</h4>
                       <ul className="space-y-2">
                        {promptHistory.map((p, index) => (
                          <li key={index} className="text-sm text-gray-400 italic">
                            <span className="font-semibold text-gray-300 not-italic mr-1">{index === 0 ? "Initial:" : "Edit:"}</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-700">
                        <h4 className="text-md font-semibold text-gray-300 mb-2">Edit with AI Chat</h4>
                        <form onSubmit={handleEditSubmit} className="flex items-center gap-2">
                            <input
                            type="text"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="e.g., add sunglasses, make the dress blue..."
                            className="flex-grow bg-gray-900 border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-white disabled:opacity-50"
                            disabled={isEditing}
                            />
                            <button
                            type="submit"
                            disabled={isEditing || !editPrompt.trim()}
                            className="flex-shrink-0 flex items-center justify-center p-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 disabled:bg-purple-900 disabled:cursor-not-allowed"
                            aria-label="Send Edit"
                            >
                            {isEditing ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <Icon icon="send" className="w-5 h-5" />
                            )}
                            </button>
                        </form>
                    </div>

                </div>
            )}
        </div>
    );
};
