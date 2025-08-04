// controllers/aiController.js
import OpenAI from 'openai';
import sql from '../config/db.js';
import { clerkClient } from '@clerk/express';
import { response } from 'express';
import {v2 as cloudinary} from 'cloudinary';
import axios from 'axios';
import FormData from 'form-data'; // This must be placed before you use FormData
import fs from 'fs'
import pdf from 'pdf-parse/lib/pdf-parse.js'


const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== 'premium' && free_usage >= 10) {
      return res.json({
        success: false,
        message: 'Limit reached, upgrade to continue.',
      });
    }

    const response = await AI.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: length,
    });

    const content = response.choices[0].message.content;

    // Optional: test DB connection
    // const test = await sql`SELECT 1`;
    // console.log('✅ DB test passed:', test);

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'article')
    `;

    if (plan !== 'premium') {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error('❌ Error generating article:', error.message);
    res.json({ success: false, message: error.message });
  }
};



//blog api

export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt} = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== 'premium' && free_usage >= 10) {
      return res.json({
        success: false,
        message: 'Limit reached, upgrade to continue.',
      });
    }

    const response = await AI.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });


    const content = response.choices[0].message.content;

    // Optional: test DB connection
    // const test = await sql`SELECT 1`;
    // console.log('✅ DB test passed:', test);

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'blog-title')
    `;

    if (plan !== 'premium') {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error('❌ Error generating blog:', error.message);
    res.json({ success: false, message: error.message });
  }
};


// === IMAGE GENERATION ===
 // ← must be here before using it

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan !== 'premium') {
      return res.status(403).json({
        success: false,
        message: 'This feature is only available for premium subscriptions',
      });
    }

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required to generate an image.',
      });
    }

    const formData = new FormData();
    formData.append('prompt', prompt);

    const clipdropResponse = await axios.post(
      'https://clipdrop-api.co/text-to-image/v1',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'x-api-key': process.env.CLIPDROP_API_KEY,
        },
        responseType: 'arraybuffer',
      }
    );

    const base64Image = `data:image/png;base64,${Buffer.from(
      clipdropResponse.data,
      'binary'
    ).toString('base64')}`;

    const cloudinaryUpload = await cloudinary.uploader.upload(base64Image);

    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${cloudinaryUpload.secure_url}, 'image', ${publish ?? false})
    `;

    res.json({
      success: true,
      content: cloudinaryUpload.secure_url,
    });
  } catch (error) {
    console.error('❌ Error generating image:', error);

    res.status(500).json({
      success: false,
      message:
        error.response?.data?.error?.message ||
        error.message ||
        'An unexpected error occurred.',
    });
  }
};

//background


export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { image} = req.file;
    const plan = req.plan;

    if (plan !== 'premium') {
      return res.status(403).json({
        success: false,
        message: 'This feature is only available for premium subscriptions',
      });
    }

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required to remove background.',
      });
    }

    


   

    const {secure_url} = await cloudinary.uploader.upload(image.path, {
        transformation: [{
            effect:'background_removal',
            background_removal: 'remove_the_background'
        }]
    });

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')
    `;

    res.json({
      success: true,
      content:secure_url,
    });
  } catch (error) {
    console.error('❌ Error background removal:', error);

    res.status(500).json({
      success: false,
      message:
        error.response?.data?.error?.message ||
        error.message ||
        'An unexpected error occurred.',
    });
  }
};


//remove image object
export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { object } =req.body;
    const { image} = req.file;
    const plan = req.plan;

    if (plan !== 'premium') {
      return res.status(403).json({
        success: false,
        message: 'This feature is only available for premium subscriptions',
      });
    }

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required to remove object.',
      });
    }

    


   

    const {public_id} = await cloudinary.uploader.upload(image.path)

    const imageURL=  cloudinary.url(public_id, {
        transformation: [{effect:`gen_remove:${object}`}],
        resource_type:'image'
    })
      

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Removed ${object} from image`}, ${imageURL}, 'image')
    `;

    res.json({
      success: true,
      content:imageURL,
    });
  } catch (error) {
    console.error('❌ Error background removal:', error);

    res.status(500).json({
      success: false,
      message:
        error.response?.data?.error?.message ||
        error.message ||
        'An unexpected error occurred.',
    });
  }
};


//review resume
export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();
    
    const resume = req.file;
    const plan = req.plan;

    if (plan !== 'premium') {
      return res.status(403).json({
        success: false,
        message: 'This feature is only available for premium subscriptions',
      });
    }

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'resume pdf required',
      });
    }

    


   

    if(resume.size > 5 * 1024 * 1024){
        return res.json({success:false, message:"Resume file size exceeds allowed size (5MB)."})
    }

    const dataBuffer = fs.readFileSync(resume.path)
    const pdfData = await pdf(dataBuffer)

    const prompt =`Review the following resume and provide constructive feedback on its strengths, weaknesses, and areas for improvement. Resume content:\n\n${pdfData.text}`

    const response = await AI.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });


    const content = response.choices[0].message.content;
      

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')
    `;

    res.json({
      success: true,
      content:content,
    });
  } catch (error) {
    console.error('❌ Error background removal:', error);

    res.status(500).json({
      success: false,
      message:
        error.response?.data?.error?.message ||
        error.message ||
        'An unexpected error occurred.',
    });
  }
}
