/* eslint-disable no-useless-escape */
import { LRUMap } from 'mnemonist';
import { type NextRequest, NextResponse } from 'next/server';

const rateLimitMap = new LRUMap<string, { count: number; lastReset: number }>(
  1000
);
const limitPerWindow = 100;
const windowMs = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const ipData = rateLimitMap.get(ip);

  if (!ipData) {
    rateLimitMap.set(ip, {
      count: 1,
      lastReset: Date.now(),
    });
    return false;
  }

  if (Date.now() - ipData.lastReset > windowMs) {
    ipData.count = 1;
    ipData.lastReset = Date.now();
    return false;
  }

  if (ipData.count >= limitPerWindow) {
    // Restart the clock on any request
    ipData.lastReset = Date.now();
    return true;
  }

  ipData.count += 1;
  return false;
}

const aibs1 = new RegExp(
  '(\.ai\ |Agentic|AI\ Article\ Writer|AI\ Chat|AI\ Content\ Detector|AI\ Dungeon|AI\ Search|AI\ SEO\ Crawler|AI\ Writer|ai-proxy|AI21\ Labs|AI2Bot|AIBot|aiHitBot|AIMatrix|AISearchBot|AI\ Training|AITraining|Alexa|Alpha\ AI)',
  'i'
);
const aibs2 = new RegExp(
  '(AlphaAI|Amazon\ Bedrock|Amazon-Kendra|Amazon\ Lex|Amazon\ Comprehend|Amazon\ Sagemaker|Amazon\ Silk|Amazon\ Textract|AmazonBot|Amelia|AndersPinkBot|AndiBot|Anthropic|AnyPicker|Anyword|Applebot|Aria\ Browse|Articoolo|AutoGLM|Automated\ Writer)',
  'i'
);
const aibs3 = new RegExp(
  '(AutoML|AwarioRssBot|AwarioSmartBot|Azure|BabyAGI|BardBot|Brave\ Leo|Brightbot|ByteDance|Bytespider|CatBoost|CC-Crawler|CCBot|chatbot|ChatGLM|Chinchilla|Claude|ClearScope|Cohere|Common\ Crawl)',
  'i'
);
const aibs4 = new RegExp(
  '(CommonCrawl|Content\ Harmony|Content\ King|Content\ Optimizer|Content\ Samurai|ContentAtScale|ContentBot|Contentedge|Conversion\ AI|Copilot|CopyAI|Copymatic|Copyscape|Cotoyogi|CrawlQ\ AI|Crawlspace|Crew\ AI|CrewAI|DALL-E|DataForSeoBot)',
  'i'
);
const aibs5 = new RegExp(
  '(DataProvider|DeepAI|DeepL|DeepMind|DeepSeek|Diffbot|Doubao\ AI|DuckAssistBot|FacebookBot|Factset|Falcon|Firecrawl|Flyriver|Frase\ AI|FriendlyCrawler|Gemini|Gemma|GenAI|Genspark)',
  'i'
);
const aibs6 = new RegExp(
  '(Inferkit|ISSCyberRiskCrawler|JasperAI|Kafkai|Kangaroo|Keyword\ Density\ AI|Knowledge|KomoBot|Lensa|Lightpanda|LLaMA|LLMs|magpie-crawler|Manus|MarketMuse|Meltwater|Meta\ AI|Meta-AI|Meta-External|MetaAI)',
  'i'
);
const aibs7 = new RegExp(
  '(GLM|Goose|GPT|Grammarly|Grendizer|Grok|GT\ Bot|GTBot|Hemingway\ Editor|Hugging\ Face|Hypotenuse\ AI|iaskspider|ICC-Crawler|ImageGen|ImagesiftBot|img2dataset|imgproxy|INK\ Editor|INKforall|IntelliSeek)',
  'i'
);
const aibs8 = new RegExp(
  '(MetaTagBot|Mistral|Monica|Narrative|NeevaBot|Neural\ Text|NeuralSEO|Nova\ Act|NovaAct|OAI-SearchBot|Omgili|Open\ AI|OpenAI|OpenBot|OpenText\ AI|Operator|Outwrite|Page\ Analyzer\ AI|PanguBot|Paperlibot)',
  'i'
);
const aibs9 = new RegExp(
  '(Paraphraser\.io|Perplexity|PetalBot|Phind|PiplBot|ProWritingAid|Puppeteer|Qualified|QuillBot|Qwen|RobotSpider|Rytr|SaplingAI|Scalenut|Scraper|Scrapy|ScriptBook|SEO\ Content\ Machine|SEO\ Robot|SemrushBot)',
  'i'
);
const aibs10 = new RegExp(
  '(Sentibot|Sidetrade|Simplified\ AI|Sitefinity|Skydancer|SlickWrite|Sonic|Spin\ Rewriter|Spinbot|Stability|StableDiffusionBot|Sudowrite|Super\ Agent|Surfer\ AI|Text\ Blaze|TextCortex|The\ Knowledge\ AI|TikTokSpider|Timpibot|Traefik)',
  'i'
);
const aibs11 = new RegExp(
  '(VelenPublicWebCrawler|Vidnami\ AI|Webzio|Whisper|WordAI|Wordtune|WormsGTP|WPBot|Writecream|WriterZen|Writescope|Writesonic|xAI|xBot|YaML|YouBot|Zero\ GTP|Zerochat|Zhipu|Zimm)',
  'i'
);

export function middleware(request: NextRequest) {
  const browser = request.headers.get('user-agent');
  if (
    !browser ||
    aibs1.exec(browser) ||
    aibs2.exec(browser) ||
    aibs3.exec(browser) ||
    aibs4.exec(browser) ||
    aibs5.exec(browser) ||
    aibs6.exec(browser) ||
    aibs7.exec(browser) ||
    aibs8.exec(browser) ||
    aibs9.exec(browser) ||
    aibs10.exec(browser) ||
    aibs11.exec(browser)
  ) {
    console.log('blocking', browser);
    return Response.json(
      { success: false, message: 'please stop' },
      { status: 403 }
    );
  }

  const ip = request.headers.get('x-forwarded-for');
  if (ip !== null && isRateLimited(ip)) {
    console.log('blocking', ip);
    return Response.json(
      { success: false, message: 'rate limit' },
      { status: 429 }
    );
  }

  return NextResponse.next();
}
