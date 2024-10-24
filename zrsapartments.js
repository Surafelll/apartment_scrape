const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

async function scrapeZRSApartments() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const sourceWebsite = "https://www.zrsapartments.com/";

  // Create folders if they don't exist
  const baseFolderPath = path.join(__dirname, "data", "zrsapartments.com");
  const jsonFolderPath = path.join(baseFolderPath, "apartments_json");
  const csvFolderPath = path.join(baseFolderPath, "zrsapartments_csv"); // Updated path for CSV

  if (!fs.existsSync(baseFolderPath)) {
    fs.mkdirSync(baseFolderPath, { recursive: true });
  }

  if (!fs.existsSync(jsonFolderPath)) {
    fs.mkdirSync(jsonFolderPath);
  }

  if (!fs.existsSync(csvFolderPath)) {
    fs.mkdirSync(csvFolderPath);
  }

  // Navigate to the source website
  await page.goto(sourceWebsite, {
    waitUntil: "networkidle2",
  });

  // Array to hold all scraped data
  const apartmentData = [];

  // Wait for the apartment cards to load
  await page.waitForSelector(".propertieslistings__property--information");

  // Get all apartment cards
  const apartmentCards = await page.$$(
    ".propertieslistings__property--information"
  );

  for (const card of apartmentCards) {
    try {
      // Scrape the title and location
      const title = await card.$eval(
        ".propertieslistings__property--name",
        (el) => el.textContent.trim()
      );
      const location = await card.$eval(
        ".propertieslistings__property--location",
        (el) => el.textContent.trim()
      );

      // Click on the link to open the apartment details page
      const detailPageUrl = await card.$eval(
        ".propertieslistings__property--link",
        (el) => el.href
      );
      const detailPage = await browser.newPage();
      await detailPage.goto(detailPageUrl, { waitUntil: "networkidle2" });

      // Attempt to scrape the phone number using your original logic
      let phone = "N/A";
      try {
        phone = await detailPage.$eval(".header__phone > a > span", (el) =>
          el.textContent.trim()
        );
      } catch (error) {
        console.error(`Could not find phone number for: ${title} using original method`);

        // New logic for alternate phone number scraping
        try {
          // Attempt to get the SMS phone number if the original method fails
          const smsPhone = await detailPage.$eval(
            ".header__phone--sms span:last-child",
            (el) => el.textContent.trim()
          );
          phone = smsPhone; // Use the SMS number if found
        } catch (error) {
          console.error(`Could not find SMS phone number for: ${title}`);
          // If all attempts fail, keep phone as "N/A"
        }
      }

      // Close the detail page
      await detailPage.close();

      // Store the scraped data
      apartmentData.push({
        from: sourceWebsite,
        title,
        location,
        phone,
      });

      console.log(`Scraped: ${title}, ${location}, ${phone}`);
    } catch (error) {
      console.error("Error scraping an apartment card:", error);
      apartmentData.push({
        from: sourceWebsite,
        title: "N/A",
        location: "N/A",
        phone: "N/A",
      });
    }
  }

  // Save data to JSON
  const jsonFilePath = path.join(jsonFolderPath, `apartments.json`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(apartmentData, null, 2));
  console.log(`Saved data to JSON file: ${jsonFilePath}`);

  // Save data to CSV
  const csvFilePath = path.join(csvFolderPath, `apartments.csv`);
  const csvWriter = createCsvWriter({
    path: csvFilePath,
    header: [
      { id: "from", title: "Source" },
      { id: "title", title: "Title" },
      { id: "location", title: "Location" },
      { id: "phone", title: "Phone" },
    ],
  });
  await csvWriter.writeRecords(apartmentData);
  console.log(`Saved data to CSV file: ${csvFilePath}`);

  console.log(
    `Scraping completed. Data saved in the 'data/zrsapartments.com/zrsapartments_json' and 'data/zrsapartments.com/zrsapartments_csv' folders.`
  );
  await browser.close();
}

scrapeZRSApartments();
