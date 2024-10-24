const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Set true for headless mode
  const page = await browser.newPage();

  // Disable CSS, JavaScript, images for faster scraping
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['stylesheet', 'font', 'image', 'script'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Navigate to the Chicago Apartments page
  await page.goto('https://www.apartments.com/chicago-il/', { waitUntil: 'networkidle2' });

  // Wait for the property cards to load
  await page.waitForSelector('.property-information'); // Adjust the selector as per need

  // Scrape title, location, and phone from each card
  const apartments = await page.evaluate(() => {
    const cards = document.querySelectorAll('.property-information');
    const data = [];

    cards.forEach(card => {
      const title = card.querySelector('.property-title').innerText;
      const location = card.querySelector('.property-address').innerText;
      let phone = card.querySelector('.phone-link');
      phone = phone ? phone.innerText : 'N/A'; // Handle if phone number is missing

      data.push({ title, location, phone });
    });

    return data;
  });

  console.log(apartments); // Print the scraped data to console

  await browser.close();
})();
