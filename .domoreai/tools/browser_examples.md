# Browser Tool Usage Examples

## Navigate to URLs
Open web pages and navigate the browser.

```typescript
// Navigate to a URL
await browser.goto('https://example.com');

// Navigate with options
await browser.goto('https://example.com', {
  waitUntil: 'networkidle',
  timeout: 30000
});

// Go back/forward
await browser.goBack();
await browser.goForward();
await browser.reload();
```

## Extract Page Content
Get text, HTML, or specific elements from web pages.

```typescript
// Get page title
const title = await browser.getTitle();

// Get page URL
const url = await browser.getUrl();

// Get full HTML
const html = await browser.getHTML();

// Get text content
const text = await browser.getText('body');

// Get element by selector
const heading = await browser.getText('h1');
const links = await browser.getElements('a');
```

## Search the Web
Perform web searches.

```typescript
// Search Google
await browser.search('TypeScript best practices');

// Search with specific engine
await browser.search('React hooks tutorial', { engine: 'google' });
```

## Interact with Pages
Click, type, and interact with web elements.

```typescript
// Click an element
await browser.click('button#submit');

// Type into an input field
await browser.type('input[name="search"]', 'query text');

// Fill a form
await browser.fill('input#username', 'john_doe');
await browser.fill('input#password', 'secret123');
await browser.click('button[type="submit"]');
```

## Take Screenshots
Capture images of web pages.

```typescript
// Take a full page screenshot
const screenshot = await browser.screenshot({ fullPage: true });

// Take a screenshot of a specific element
const elementScreenshot = await browser.screenshot({ 
  selector: '#main-content' 
});

// Save screenshot to file
await browser.screenshot({ 
  path: '/path/to/screenshot.png',
  fullPage: true 
});
```

## Wait for Elements
Wait for page elements to appear or conditions to be met.

```typescript
// Wait for an element to appear
await browser.waitForSelector('#dynamic-content');

// Wait for navigation
await browser.waitForNavigation();

// Wait for a specific timeout
await browser.wait(2000); // 2 seconds
```

## Execute JavaScript
Run custom JavaScript in the page context.

```typescript
// Execute JavaScript
const result = await browser.evaluate(() => {
  return document.querySelectorAll('a').length;
});

// Execute with arguments
const text = await browser.evaluate((selector) => {
  return document.querySelector(selector)?.textContent;
}, '#heading');
```

## Download Resources
Download files from the web.

```typescript
// Download a file
await browser.download('https://example.com/file.pdf', '/path/to/save/file.pdf');

// Download with custom headers
await browser.download('https://api.example.com/data', '/path/to/data.json', {
  headers: {
    'Authorization': 'Bearer token123'
  }
});
```

## Manage Cookies
Get and set browser cookies.

```typescript
// Get all cookies
const cookies = await browser.getCookies();

// Set a cookie
await browser.setCookie({
  name: 'session',
  value: 'abc123',
  domain: 'example.com'
});

// Delete cookies
await browser.deleteCookies();
```

## Handle Multiple Pages/Tabs
Work with multiple browser tabs.

```typescript
// Open a new tab
const newPage = await browser.newPage();
await newPage.goto('https://example.com');

// Switch between tabs
await browser.switchToTab(1);

// Close a tab
await browser.closeTab();
```
