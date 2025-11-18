import React, { useState } from 'react';
import { UserInput } from '../types';
import { Icon } from './Icon';
import { SpeechInput } from './SpeechInput';

interface InputFormProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
}

export const ImageInput: React.FC<{
  id: string;
  label: string;
  onChange: (file: File | null) => void;
}> = ({ id, label, onChange }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFileName('');
      setPreview(null);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md hover:border-indigo-500 transition-colors">
        <div className="space-y-1 text-center">
          {preview ? (
            <img src={preview} alt="Preview" className="mx-auto h-24 w-24 object-cover rounded-md" />
          ) : (
            <Icon icon="upload" className="mx-auto h-12 w-12 text-gray-500" />
          )}
          <div className="flex text-sm text-gray-400">
            <label htmlFor={id} className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-indigo-500 px-1">
              <span>Upload a file</span>
              <input id={id} name={id} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">{fileName || 'PNG, JPG, GIF up to 10MB'}</p>
        </div>
      </div>
    </div>
  );
};

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<UserInput>({
    productImage: null,
    actorImage: null,
    productDescription: '',
    cta: '',
    platform: 'TikTok',
    aspectRatio: '9:16',
    videoLength: 8,
    tone: 'cinematic, luxury',
    generateVoiceover: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) || 0 : value }));
    }
  };

  const handleFileChange = (name: 'productImage' | 'actorImage') => (file: File | null) => {
    setFormData(prev => ({ ...prev, [name]: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productImage) {
        alert("Please upload a product image.");
        return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImageInput id="productImage" label="Product Image (Required)" onChange={handleFileChange('productImage')} />
        <ImageInput id="actorImage" label="Actor/Model Image (Optional)" onChange={handleFileChange('actorImage')} />
      </div>
      
      <SpeechInput
        id="productDescription"
        name="productDescription"
        label="Product Description"
        value={formData.productDescription}
        onChange={handleChange}
        placeholder="e.g., A vibrant red summer dress made of silk."
        isTextarea
        rows={3}
        required
      />
      
      <SpeechInput
        id="cta"
        name="cta"
        label="Call-to-Action (CTA)"
        value={formData.cta}
        onChange={handleChange}
        placeholder="e.g., Shop now at dresses.com"
        required
      />

      <div>
        <label htmlFor="tone" className="block text-sm font-medium text-gray-300">Tone / Style</label>
        <input type="text" id="tone" name="tone" value={formData.tone} onChange={handleChange} className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white" placeholder="e.g., cinematic, playful, luxury, minimal" required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="platform" className="block text-sm font-medium text-gray-300">Target Platform</label>
          <select id="platform" name="platform" value={formData.platform} onChange={handleChange} className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white">
            <option>TikTok</option>
            <option>Reels</option>
            <option>YouTube Shorts</option>
            <option>Meta</option>
          </select>
        </div>
        <div>
          <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300">Aspect Ratio</label>
          <select id="aspectRatio" name="aspectRatio" value={formData.aspectRatio} onChange={handleChange} className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white">
            <option>9:16</option>
            <option>16:9</option>
          </select>
        </div>
        <div>
            <label htmlFor="videoLength" className="block text-sm font-medium text-gray-300">Length (seconds)</label>
            <input type="number" id="videoLength" name="videoLength" value={formData.videoLength} onChange={handleChange} min="3" max="15" className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white" required />
        </div>
      </div>
      
       <div className="flex items-start">
        <div className="flex items-center h-5">
          <input id="generateVoiceover" name="generateVoiceover" type="checkbox" checked={formData.generateVoiceover} onChange={handleChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-600 rounded bg-gray-800" />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="generateVoiceover" className="font-medium text-gray-300">Generate Voiceover</label>
          <p className="text-gray-500">Add a short AI-generated voiceover based on the CTA.</p>
        </div>
      </div>
      
      <div>
        <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed">
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
                  Generate Ad
                </>
            )}
        </button>
      </div>
    </form>
  );
};