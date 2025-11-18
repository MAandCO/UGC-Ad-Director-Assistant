import React, { useState, useCallback, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { ProgressBar } from './components/ProgressBar';
import { Icon } from './components/Icon';
import { UserInput, ImageData, AdConcept, FinalOutput, ProgressUpdate } from './types';
import * as geminiService from './services/geminiService';
import { ModelCreator } from './components/ModelCreator';

const TOTAL_STEPS = 8;

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

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<ProgressUpdate>({ step: 0, message: '' });
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<FinalOutput | null>(null);
    const [apiKeySelected, setApiKeySelected] = useState<boolean | null>(null);
    
    useEffect(() => {
        const checkApiKey = async () => {
            if ((window as any).aistudio) {
                const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                setApiKeySelected(hasKey);
            } else {
                setApiKeySelected(true); // Assume non-aistudio environment has key
            }
        };
        checkApiKey();
    }, []);


    const updateProgress = (step: number, message: string) => {
        setProgress({ step, message });
    };

    const handleGenerateAd = useCallback(async (data: UserInput) => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        // API Key Check for Veo
        if ((window as any).aistudio) {
             const hasKey = await (window as any).aistudio.hasSelectedApiKey();
             if (!hasKey) {
                 await (window as any).aistudio.openSelectKey();
                 setApiKeySelected(true); // Assume success after opening dialog
             }
        }

        try {
            // STAGE 1
            updateProgress(1, "Analyzing images...");
            const productImageData = await fileToBase64(data.productImage!);
            let imageAnalysis = await geminiService.analyzeImage(productImageData);

            const actorImageData = data.actorImage ? await fileToBase64(data.actorImage) : null;
            if (actorImageData) {
                const actorAnalysis = await geminiService.analyzeImage(actorImageData);
                imageAnalysis += `\nActor Analysis: ${actorAnalysis}`;
            }

            updateProgress(2, "Generating ad concept...");
            const concept: AdConcept = await geminiService.generateAdConcept(imageAnalysis, data.productDescription, data.tone);

            let openingFrameData: ImageData | null = null;
            let qcNotes = "QC passed on first attempt.";

            for (let i = 1; i <= 3; i++) {
                updateProgress(3, `Generating opening frame (Attempt ${i}/3)...`);

                if (actorImageData) {
                    openingFrameData = await geminiService.generateOpeningFrameWithActor(concept.openingFramePrompt, actorImageData);
                } else {
                    const openingFrameB64 = await geminiService.generateImage(concept.openingFramePrompt, data.aspectRatio);
                    openingFrameData = { base64: openingFrameB64, mimeType: 'image/jpeg' };
                }

                updateProgress(4, `Validating frame (Attempt ${i}/3)...`);
                const validationResult = await geminiService.validateImage(openingFrameData);

                if (validationResult.isValid) {
                    qcNotes = i > 1 ? `QC passed on attempt ${i}.` : qcNotes;
                    break;
                } else {
                    qcNotes = `Attempt ${i} failed QC: ${validationResult.suggestion}. Refining prompt.`;
                    concept.openingFramePrompt += `. IMPORTANT FIX: ${validationResult.suggestion}`;
                    if (i === 3) {
                         qcNotes = `QC failed after 3 attempts. Using best available image. Final issue: ${validationResult.suggestion}`;
                    }
                }
            }

            if (!openingFrameData) throw new Error("Failed to generate a valid opening frame.");
            const openingFrameUrl = `data:${openingFrameData.mimeType};base64,${openingFrameData.base64}`;

            // STAGE 2
            updateProgress(5, "Writing video script...");
            const veoPrompt = await geminiService.generateVideoDirectorPrompt(concept, data);
            
            updateProgress(6, "Generating video (this may take a few minutes)...");
            const videoUrl = await geminiService.generateVideo(
                veoPrompt,
                openingFrameData,
                data.aspectRatio,
                (message) => updateProgress(6, message)
            );
            
            let voiceoverUrl: string | undefined;
            if(data.generateVoiceover) {
                 updateProgress(7, "Generating voiceover...");
                 // FIX: Improved prompt for text-to-speech generation.
                 const voText = `Say with a ${data.tone} tone: ${data.cta}`;
                 voiceoverUrl = await geminiService.generateSpeech(voText);
            }


            updateProgress(8, "Generating ad assets...");
            const adAssets = await geminiService.generateAdAssets(data.productDescription, data.cta, data.tone);

            // Final Output
            const finalOutput: FinalOutput = {
                ad_title: concept.adTitle,
                ad_idea: concept.adIdea,
                ad_description: concept.adDescription,
                platform: data.platform,
                aspect_ratio: data.aspectRatio,
                cta_line: data.cta,
                tone: data.tone,
                opening_frame_prompt: concept.openingFramePrompt,
                opening_frame_image_url: openingFrameUrl,
                veo_prompt: veoPrompt,
                veo_video_url: videoUrl,
                qc_notes: qcNotes,
                ad_copy_variations: adAssets.adCopyVariations,
                hashtags: adAssets.hashtags,
                voiceover_audio_url: voiceoverUrl
            };
            setResult(finalOutput);

        } catch (e: any) {
            console.error(e);
            let errorMessage = e.message || "An unknown error occurred.";
            if (e.message?.includes("Requested entity was not found")) {
                 errorMessage = "API Key not found or invalid. Please select a valid API key and try again.";
                 setApiKeySelected(false);
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setProgress({ step: 0, message: '' });
        }
    }, []);

    const handleSelectKey = async () => {
        if ((window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
            setApiKeySelected(true);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <main className="max-w-4xl mx-auto px-4 py-8">
                <header className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                        UGC Ad Director Assistant
                    </h1>
                    <p className="mt-4 text-lg text-gray-400">
                        Your AI partner for creating viral video ads from a single prompt.
                    </p>
                </header>

                <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl shadow-indigo-900/20">
                     {apiKeySelected === false && (
                        <div className="mb-6 p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-md flex items-center justify-between">
                            <div className='flex items-center'>
                                <Icon icon="warning" className="w-6 h-6 text-yellow-400 mr-3" />
                                <p className="text-yellow-300">A Google AI Studio API key is required to generate videos. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-200">Learn about billing</a>.</p>
                            </div>
                            <button onClick={handleSelectKey} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md whitespace-nowrap">
                                Select API Key
                            </button>
                        </div>
                    )}
                    
                    <InputForm onSubmit={handleGenerateAd} isLoading={isLoading} />
                </div>
                
                <ModelCreator />

                {isLoading && <ProgressBar progress={progress} totalSteps={TOTAL_STEPS} />}

                {error && (
                    <div className="mt-8 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-md relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                
                {result && !isLoading && <ResultsDisplay result={result} />}

            </main>
        </div>
    );
};

export default App;