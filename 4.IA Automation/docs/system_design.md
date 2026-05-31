# E-commerce Automation System Architecture

## 1. Google Sheets Structure (Data Source)

The Google Sheet will serve as the central database. Here are the recommended columns:

| Column Name | Description | Example |
|-------------|-------------|---------|
| **Product ID** | Unique identifier | `P001` |
| **Product Name** | Name of the product | `Wireless Headphones` |
| **Image/Video URL** | Link to the media file | `https://example.com/img.jpg` |
| **Product Features** | Key selling points | `Active Noise Cancelling, 40h Battery` |
| **Price** | Selling price | `2990` |
| **Affiliate/Shop Link**| Link to purchase | `https://tiktok.com/...` |
| **Generated Caption**| AI-generated text | (Filled by GAS) |
| **Status** | Current state | `Pending AI`, `Waiting Approval`, `Approved`, `Posted`, `Rejected` |
| **Facebook Post ID** | ID from FB API | (Filled after post) |
| **TikTok Post ID** | ID from TikTok API | (Filled after post) |
| **Created At** | Timestamp | `2024-05-17` |

## 2. System Components

- **Google Apps Script (GAS):** The "Brain" connecting everything.
- **Gemini API:** For generating engaging Thai captions.
- **LINE Messaging API:** For the approval workflow via Flex Messages.
- **Facebook Graph API:** For auto-posting to Pages.
- **TikTok API:** For content sharing.

## 3. Workflow

1. **GAS** scans the sheet for `Pending AI` status.
2. **Gemini** generates a caption and updates the sheet to `Waiting Approval`.
3. **GAS** sends a LINE Flex Message to the admin with "Approve" / "Reject" buttons.
4. **Admin** clicks a button, triggering the GAS `doPost(e)` webhook.
5. If **Approved**, GAS posts to FB/TikTok and updates status to `Posted`.
