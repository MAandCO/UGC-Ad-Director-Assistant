export interface UserInput {
  productImage: File | null;
  actorImage: File | null;
  productDescription: string;
  cta: string;
  platform: 'TikTok' | 'Reels' | 'YouTube Shorts' | 'Meta';
  aspectRatio: '9:16' | '16:9';
  videoLength: number;
  tone: string;
  generateVoiceover: boolean;
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface AdConcept {
  adTitle: string;
  adIdea: string;
  adDescription: string;
  openingFramePrompt: string;
}

export interface ImageValidationResult {
  isValid: boolean;
  suggestion: string;
}

export interface FinalOutput {
  ad_title: string;
  ad_idea: string;
  ad_description: string;
  platform: string;
  aspect_ratio: string;
  cta_line: string;
  tone: string;
  opening_frame_prompt: string;
  opening_frame_image_url: string;
  veo_prompt: string;
  veo_video_url: string;
  qc_notes: string;
  ad_copy_variations: string[];
  hashtags: string[];
  voiceover_audio_url?: string;
}

export interface ProgressUpdate {
    step: number;
    message: string;
}