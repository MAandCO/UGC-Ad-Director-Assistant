// FIX: Removed unused `GenerateContentResponse` import.
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AdConcept, ImageData, ImageValidationResult } from "../types";

const POLLING_INTERVAL = 10000; // 10 seconds

// This function must be called right before making an API call to use the latest key
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

export const analyzeImage = async (imageData: ImageData): Promise<string> => {
    const ai = getAiClient();
    const imagePart = fileToGenerativePart(imageData.base64, imageData.mimeType);
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                imagePart,
                { text: "Analyze this image. Summarize what the product or person looks like (color, shape, material, setting, gender presentation, hair, body type, outfit, vibe) and any brand/style cues." }
            ]
        },
    });
    return result.text;
};

export const generateAdConcept = async (imageAnalysis: string, productDescription: string, tone: string): Promise<AdConcept> => {
    const ai = getAiClient();
    const prompt = `
        Based on the following analysis and user inputs, generate an ad concept.
        Image Analysis: ${imageAnalysis}
        Product Description: ${productDescription}
        Tone/Style: ${tone}

        Generate:
        1. A strong ad title.
        2. A clear ad idea (1-2 paragraphs).
        3. A short, punchy ad description for social media (1-2 sentences).
        4. A detailed, photorealistic opening frame prompt for an image model. Include full body framing, camera angle, lens, lighting, environment, clothing, pose, how the product is shown, mood, and color palette. Ensure the prompt is optimized to prevent cut-off subjects or impossible poses.
    `;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 },
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    adTitle: { type: Type.STRING },
                    adIdea: { type: Type.STRING },
                    adDescription: { type: Type.STRING },
                    openingFramePrompt: { type: Type.STRING },
                },
                required: ["adTitle", "adIdea", "adDescription", "openingFramePrompt"],
            }
        }
    });
    
    return JSON.parse(result.text);
};

export const generateOpeningFrameWithActor = async (prompt: string, actorImage: ImageData): Promise<ImageData> => {
    const ai = getAiClient();

    const generationPrompt = `Create a new, photorealistic image featuring the person from the provided headshot. Place them in the scene described here: "${prompt}". Ensure the final image is a high-quality, realistic photograph where the person's head and body look natural together. The face must be an exact match to the provided headshot.`;
    
    const actorImagePart = fileToGenerativePart(actorImage.base64, actorImage.mimeType);

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: generationPrompt },
          actorImagePart,
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    const parts = result.candidates?.[0]?.content?.parts;

    if (!parts) {
        const finishReason = result.candidates?.[0]?.finishReason;
        console.error("Image generation with actor failed. Full response:", JSON.stringify(result, null, 2));
        const userMessage = `Image generation with actor failed. The request may have been blocked due to safety settings (Finish Reason: ${finishReason || 'Not specified'}). Please try using a different actor image.`;
        throw new Error(userMessage);
    }

    for (const part of parts) {
      if (part.inlineData) {
        return {
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
        };
      }
    }

    throw new Error("Image generation with actor failed: No image data found in the response.");
};

export const generateImage = async (prompt: string, aspectRatio: '9:16' | '16:9'): Promise<string> => {
    const ai = getAiClient();
    const result = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio,
        }
    });

    if (!result.generatedImages || result.generatedImages.length === 0) {
        throw new Error("Image generation failed to produce an image.");
    }
    return result.generatedImages[0].image.imageBytes;
};

export const validateImage = async (imageData: ImageData): Promise<ImageValidationResult> => {
    const ai = getAiClient();
    const imagePart = fileToGenerativePart(imageData.base64, imageData.mimeType);

    const prompt = `
        As an ad image quality control agent, analyze the provided image.
        Check for these specific issues:
        - Is the framing correct (e.g., not cutting off feet/head if a full-length shot was implied)?
        - Is the product clearly visible and correctly scaled?
        - Are there any anatomical impossibilities (extra limbs, warped hands, broken faces)?
        - Are there any obvious AI glitches (messed up text, floating objects, distorted background)?
        - Does it look photorealistic?

        Respond with a JSON object indicating if it's valid and a suggestion for improvement if not.
    `;
    
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isValid: { type: Type.BOOLEAN },
                    suggestion: { type: Type.STRING, description: "A short explanation of what is wrong and how to fix the prompt." },
                },
                required: ["isValid", "suggestion"],
            }
        }
    });
    
    return JSON.parse(result.text);
};


export const generateVideoDirectorPrompt = async (concept: AdConcept, userInput: { cta: string, aspectRatio: string, platform: string, tone: string, videoLength: number }): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
      Act as a video director. Based on the following concept, write a Veo-ready prompt for a ${userInput.videoLength}-second ad.
      
      Ad Title: ${concept.adTitle}
      Ad Idea: ${concept.adIdea}
      Aspect Ratio: ${userInput.aspectRatio}
      Platform: ${userInput.platform}
      Tone: ${userInput.tone}
      Video Length: ${userInput.videoLength} seconds
      Call-to-Action: "${userInput.cta}"
      
      The prompt must describe ONE continuous master scene. Break down the ${userInput.videoLength}-second timeline in detail (e.g., 0.0-2.0s, 2.0-4.0s, etc.). For each segment, specify camera movement, actor actions, product features, and any on-screen text. The description must be camera- and scene-focused. The opening should match the opening frame prompt: "${concept.openingFramePrompt}". Crucially, the actor's face and appearance must be consistently maintained throughout the video, matching the provided opening frame. The CTA should be integrated at the end.
    `;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
    });
    
    return result.text;
};

export const generateVideo = async (
    prompt: string, 
    openingFrame: ImageData, 
    aspectRatio: '9:16' | '16:9',
    onProgress: (message: string) => void
): Promise<string> => {
    const ai = getAiClient();
    onProgress("Starting video generation with Veo...");

    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: openingFrame.base64,
            mimeType: openingFrame.mimeType,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });
    
    onProgress("Video processing initiated. This can take several minutes. Polling for status...");
    
    let pollCount = 1;
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        onProgress(`Polling for video status (Attempt #${pollCount++})...`);
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // FIX: Check for an error in the completed operation object.
    if (operation.error) {
        console.error("Video generation failed with an error:", operation.error);
        throw new Error(`Video generation failed: ${operation.error.message || 'Unknown error'}`);
    }

    if (!operation.response?.generatedVideos?.[0]?.video?.uri) {
        console.error("Video generation completed, but no video URI was found. Full operation object:", operation);
        throw new Error("Video generation completed, but no video URI was found.");
    }
    
    onProgress("Video generated successfully! Fetching video data...");

    const downloadLink = operation.response.generatedVideos[0].video.uri;
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video. Status: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
};


export const generateAdAssets = async (productDescription: string, cta: string, tone: string): Promise<{ adCopyVariations: string[], hashtags: string[] }> => {
    const ai = getAiClient();
    const prompt = `
        Generate assets for a social media ad.
        Product: ${productDescription}
        CTA: ${cta}
        Tone: ${tone}
        
        Provide:
        1. 3 short, punchy ad copy variations (hooks or primary text).
        2. 5 relevant hashtags (do not include the # symbol).

        Return a JSON object with two keys: "adCopyVariations" (an array of strings) and "hashtags" (an array of strings).
    `;
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    adCopyVariations: { 
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    hashtags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["adCopyVariations", "hashtags"]
            }
        }
    });

    return JSON.parse(result.text);
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const getWavHeader = (dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number) => {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;

    view.setUint8(0, 'R'.charCodeAt(0)); view.setUint8(1, 'I'.charCodeAt(0)); view.setUint8(2, 'F'.charCodeAt(0)); view.setUint8(3, 'F'.charCodeAt(0));
    view.setUint32(4, 36 + dataLength, true);
    view.setUint8(8, 'W'.charCodeAt(0)); view.setUint8(9, 'A'.charCodeAt(0)); view.setUint8(10, 'V'.charCodeAt(0)); view.setUint8(11, 'E'.charCodeAt(0));
    view.setUint8(12, 'f'.charCodeAt(0)); view.setUint8(13, 'm'.charCodeAt(0)); view.setUint8(14, 't'.charCodeAt(0)); view.setUint8(15, ' '.charCodeAt(0));
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint8(36, 'd'.charCodeAt(0)); view.setUint8(37, 'a'.charCodeAt(0)); view.setUint8(38, 't'.charCodeAt(0)); view.setUint8(39, 'a'.charCodeAt(0));
    view.setUint32(40, dataLength, true);

    return new Uint8Array(buffer);
};

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAiClient();
    const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        // FIX: The text is now a complete prompt including instructions for tone, so we pass it directly.
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        }
    });
    const base64Audio = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("TTS generation failed.");
    }

    const audioBytes = decode(base64Audio);
    
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const header = getWavHeader(audioBytes.length, sampleRate, numChannels, bitsPerSample);
    const wavBytes = new Uint8Array(header.length + audioBytes.length);
    wavBytes.set(header, 0);
    wavBytes.set(audioBytes, header.length);

    const blob = new Blob([wavBytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};

export const generateModelImage = async (fashionPhoto: ImageData, headshot: ImageData): Promise<{imageUrl: string, prompt: string}> => {
    const ai = getAiClient();

    // 1. Analyze the fashion photo for a description
    const analysisPrompt = "Analyze this image. Describe in detail the person's outfit, pose, the environment, lighting, and overall style. This description is for generating a new image with a different person. Do NOT describe the original person's face, head, or specific physical attributes.";
    const fashionImagePart = fileToGenerativePart(fashionPhoto.base64, fashionPhoto.mimeType);

    const analysisResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [fashionImagePart, { text: analysisPrompt }] }
    });
    const description = analysisResult.text;

    // 2. Generate a new image using the description and the headshot
    const generationPrompt = `Create a new, full-body, photorealistic image featuring the person from the provided headshot. The person should wear the outfit, and be in the pose and environment described here: "${description}". Ensure the final image is a high-quality, realistic photograph where the person's head and body look natural together.`;
    const headshotPart = fileToGenerativePart(headshot.base64, headshot.mimeType);

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: generationPrompt,
          },
          headshotPart,
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    const parts = result.candidates?.[0]?.content?.parts;

    if (!parts) {
        const finishReason = result.candidates?.[0]?.finishReason;
        console.error("Image generation failed. Full response:", JSON.stringify(result, null, 2));
        const userMessage = `Model image generation failed. The request may have been blocked due to safety settings (Finish Reason: ${finishReason || 'Not specified'}). Please try using different fashion or headshot images.`;
        throw new Error(userMessage);
    }

    for (const part of parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return {
            imageUrl: `data:image/png;base64,${base64ImageBytes}`,
            prompt: generationPrompt,
        };
      }
    }

    throw new Error("Model image generation failed: No image data found in the response.");
};


export const editModelImage = async (baseImage: ImageData, prompt: string): Promise<string> => {
    const ai = getAiClient();

    const imagePart = fileToGenerativePart(baseImage.base64, baseImage.mimeType);
    const textPart = { text: prompt };

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [imagePart, textPart],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const parts = result.candidates?.[0]?.content?.parts;

    if (!parts) {
        const finishReason = result.candidates?.[0]?.finishReason;
        console.error("Image editing failed. Full response:", JSON.stringify(result, null, 2));
        const userMessage = `Model image editing failed. The request may have been blocked due to safety settings (Finish Reason: ${finishReason || 'Not specified'}). Please try a different edit prompt or image.`;
        throw new Error(userMessage);
    }
    
    for (const part of parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;
            return `data:${mimeType};base64,${base64ImageBytes}`;
        }
    }
    
    throw new Error("Model image editing failed: No image data found in the response.");
};