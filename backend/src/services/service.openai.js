import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const callOpenAi = async (prompt, expectJson = true) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 1500,
    });

    const text = response.choices[0].message.content;

    if (expectJson) {
      const cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(cleaned);
    }

    return text;
  } catch (err) {
    console.error('OpenAI API error:', err.message);
    throw new Error(`OpenAI API failed: ${err.message}`);
  }
};

export const callOpenAiVision = async (imageBuffer, prompt) => {
  try {
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_completion_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const text = response.choices[0].message.content;
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.error('OpenAI Vision API error:', err.message);
    throw new Error(`OpenAI Vision failed: ${err.message}`);
  }
};
