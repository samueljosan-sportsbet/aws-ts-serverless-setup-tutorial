import axios from 'axios';
import * as cheerio from 'cheerio';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Kafka, Producer, Message } from 'kafkajs';

interface VivantisProduct {
  brand: string;
  name: string;
  price: string;
}

const baseUrl = 'https://www.vivantis.ro/parfumuri/pentru-barbati/?page=';
const brokers = ["localhost:19092"];

const kafka = new Kafka({
  clientId: 'vivantis-scraper',
  brokers: brokers
});

const producer: Producer = kafka.producer();

const getProductCards = (html: string): cheerio.Cheerio<any> => {
  const $ = cheerio.load(html);
  return $('div.product-card');
};

const extractProductDetails = (tag: any): VivantisProduct | null => {
  const $ = cheerio.load(tag);
  try {
    const brand_name = $('div.brand').text().trim();
    const product_name = $('div.product-name').text().trim();
    const product_price_tag = $('div.price-actual span').text().trim();

    return {
      brand: brand_name,
      name: product_name,
      price: product_price_tag
    };
  } catch (error) {
    console.error(`Error extracting product details: ${error}`);
    return null;
  }
};

const scrapePage = async (pageNumber: number): Promise<VivantisProduct[]> => {
  const url = `${baseUrl}${pageNumber}`;
  const products: VivantisProduct[] = [];

  try {
    const response = await axios.get(url);
    if (response.status !== 200) {
      console.error(`Failed to retrieve page ${pageNumber}. Status code: ${response.status}`);
      return products;
    }

    const productCards = getProductCards(response.data);
    productCards.each((_, element) => {
      const productDetails = extractProductDetails(element);
      if (productDetails) {
        products.push(productDetails);
      }
    });
  } catch (error) {
    console.error(`Error occurred on page ${pageNumber}: ${error}`);
  }

  return products;
};

const scrapeAllPages = async (): Promise<VivantisProduct[]> => {
  let currentPageNumber = 1;
  const allProducts: VivantisProduct[] = [];

  while (currentPageNumber <= 2) {
    const products = await scrapePage(currentPageNumber);
    if (products.length === 0) {
      break;
    }
    allProducts.push(...products);
    currentPageNumber += 1;
  }

  console.log(`Total products scraped: ${allProducts.length}`);
  return allProducts;
};

const sendToKafka = async (products: VivantisProduct[]) => {
  await producer.connect();
  const messages: Message[] = products.map(product => ({
    value: JSON.stringify(product)
  }));

  await producer.send({
    topic: 'vivantis-perfumes',
    messages: messages
  });

  await producer.disconnect();
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const products = await scrapeAllPages();
    await sendToKafka(products);
    return {
      statusCode: 200,
      body: JSON.stringify(products)
    };
  } catch (error) {
    console.error(`Error in handler: ${error}`);
    return {
      statusCode: 500,
      body: 'An error occurred while scraping products.',
    };
  }
};
