const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

const generateReply = async (tweet, context) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that generates Twitter replies. 
                   Context: ${context}
                   Keep replies under 280 characters.`
        },
        {
          role: "user",
          content: `Generate a reply to this tweet: "${tweet}"`
        }
      ],
      max_tokens: 100,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to generate reply');
  }
};

const generateReplyGrok = async (tweet, context) => {
  try {
    const completion = await grok.chat.completions.create({
      model: "grok-3",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that generates Twitter replies. 
                   Context: ${context}
                   Keep replies under 280 characters.`
        },
        {
          role: "user",
          content: `Generate a reply to this tweet: "${tweet}"`
        }
      ],
      max_tokens: 100,
    });
    console.log("calling grok,", completion);

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Grok API Error:', error);
    throw new Error('Failed to generate reply');
  }
};

module.exports = { generateReply,generateReplyGrok }; 