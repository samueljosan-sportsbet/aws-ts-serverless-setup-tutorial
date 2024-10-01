import axios from 'axios';
import * as cheerio from 'cheerio';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface Product {
  name: string;
  price: string;
  brand: string;
}

const baseUrl = 'https://www.parfimo.ro/parfumuri-pentru-barbati/?c=668&f[sex][]=4&page=';

const getProductCards = (html: string): cheerio.Cheerio<any> => {
  const $ = cheerio.load(html);
  return $('div.ProductList-item');
};

const extractProductDetails = (tag: any): Product | null => {
  const $ = cheerio.load(tag);
  try {
    const nameTag = $('h3.ProductCard-subtitle a').text();
    const price = $('span.ProductCard-price').text().trim().replace('\u00a0', ' ') || 'N/A';
    const brand = $('h3.ProductCard-title a').text();

    return {
    brand: brand,
    name: nameTag,
    price
    };
  } catch (error) {
    console.error(`Error extracting product details: ${error}`);
    return null;
  }
};

const scrapePage = async (pageNumber: number): Promise<Product[]> => {
  const url = `${baseUrl}${pageNumber}`;
  const products: Product[] = [];

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

const scrapeAllPages = async (): Promise<Product[]> => {
  let currentPageNumber = 1;
  const allProducts: Product[] = [];

  while (true) {
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

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const products = await scrapeAllPages();
    return {
      statusCode: 200,
      body: JSON.stringify(products),
    };
  } catch (error) {
    console.error(`Error in handler: ${error}`);
    return {
      statusCode: 500,
      body: 'An error occurred while scraping products.',
    };
  }
};