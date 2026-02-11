# 🤖 AI Assistant User Guide

**AzVirt DMS AI Assistant** - Your intelligent business assistant powered by local AI models

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Features](#features)
4. [How to Use](#how-to-use)
5. [Voice Commands](#voice-commands)
6. [Image Analysis](#image-analysis)
7. [Prompt Templates](#prompt-templates)
8. [Available Tools](#available-tools)
9. [Model Selection](#model-selection)
10. [Tips & Best Practices](#tips--best-practices)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The AI Assistant is your intelligent helper for managing your concrete production and delivery business. It can:

- **Answer Questions** - Ask anything about your inventory, deliveries, quality tests, or operations
- **Execute Tasks** - Log work hours, update inventory, manage documents
- **Analyze Images** - Extract text from documents, analyze quality control photos
- **Voice Input** - Speak your commands in English or Bosnian
- **Generate Reports** - Create summaries, forecasts, and business insights

---

## 🚀 Getting Started

### Accessing the AI Assistant

1. Log in to AzVirt DMS
2. Navigate to **AI Assistant** from the main menu
3. Click **+ New Conversation** to start chatting

### Your First Conversation

Try these example questions:

```
"How much cement do we have in stock?"
"Show me today's deliveries"
"What were the quality test results for delivery #123?"
"Generate a forecast for gravel consumption"
```

---

## ✨ Features

### 💬 Chat Interface

- **Real-time Responses** - Get instant answers from AI
- **Conversation History** - All your chats are saved and searchable
- **Multiple Conversations** - Organize different topics separately
- **Smart Context** - AI remembers your conversation context

### 🎤 Voice Input

- **Multi-language** - Speak in English or Bosnian
- **Automatic Transcription** - Voice is converted to text
- **Hands-free** - Perfect for busy work environments

### 📸 Image Analysis

- **OCR (Text Extraction)** - Extract text from photos of invoices, receipts, forms
- **Vision Analysis** - Describe and analyze any image
- **Quality Control** - Analyze concrete samples for defects
- **Document Processing** - Automatically extract structured data from documents

### 🛠️ Agentic Tools

The AI can perform actions on your behalf:

- Search and check inventory levels
- Track delivery status
- Find documents
- Review quality tests
- Log work hours
- Update stock quantities
- Generate forecasts
- Calculate statistics

---

## 📖 How to Use

### Basic Chat

1. **Type your question** in the input box at the bottom
2. **Press Enter** or click the **Send** button
3. **Wait for response** - AI processes your request
4. **Review answer** - AI provides detailed information

**Example:**
```
You: "How many deliveries do we have scheduled for tomorrow?"
AI: "You have 5 deliveries scheduled for tomorrow:
     - Project Alpha: 10m³ at 8:00 AM
     - Project Beta: 15m³ at 10:30 AM
     ..."
```

### Managing Conversations

#### Create New Conversation
- Click the **+ (Plus)** button in the sidebar
- Each conversation has its own context and history

#### Switch Conversations
- Click on any conversation in the sidebar
- Previous messages load automatically

#### Delete Conversation
- Click the **trash icon** next to a conversation
- Confirm deletion (this cannot be undone)

---

## 🎤 Voice Commands

### How to Use Voice Input

1. **Click the microphone icon** 🎤
2. **Speak clearly** into your microphone
3. **Click the stop button** when finished
4. **Wait for transcription** - Voice converts to text
5. **Message sends automatically** to AI

### Supported Languages

- **English** - Full support
- **Bosnian/Serbian/Croatian** - Full support

### Voice Command Examples

**English:**
```
"How much concrete was delivered today?"
"Show me the quality test results"
"What materials are low in stock?"
```

**Bosnian:**
```
"Koliko betona je dostavljeno danas?"
"Prikaži rezultate kontrole kvaliteta"
"Koji materijali su pri kraju?"
```

### Tips for Voice Input

✅ **Do:**
- Speak clearly and at normal pace
- Use natural language
- Speak in complete sentences
- Keep recordings under 10 minutes

❌ **Don't:**
- Speak too fast or too slow
- Use lots of background noise
- Record in noisy environments
- Switch languages mid-sentence

---

## 📸 Image Analysis

### Uploading Images

1. **Click the image icon** 📷 in the chat input
2. **Upload Section Opens** below the input
3. **Choose Method:**
   - Click to browse files
   - Drag & drop image onto upload area
4. **Preview appears** with image thumbnail
5. **Click "Process Image"** to analyze

### What You Can Do

#### 📄 Extract Text (OCR)

Perfect for:
- Invoices from suppliers
- Delivery receipts
- Handwritten forms
- Scanned documents
- Labels and signs

**Example:**
```
Upload: Photo of supplier invoice
AI: "Invoice #12345
     Date: 2025-02-05
     Supplier: ABC Materials
     Items:
     - Cement: 500kg @ $150
     - Gravel: 1000kg @ $80
     Total: $230"
```

#### 🔍 Analyze Images

Perfect for:
- Quality control photos
- Equipment condition
- Site photos
- Product samples

**Example:**
```
Upload: Photo of concrete sample
AI: "This concrete sample shows:
     - Good consistency and texture
     - Uniform color distribution
     - No visible cracks or voids
     - Meets quality standards
     Recommendation: Approved for use"
```

#### 🧪 Quality Control Analysis

Specialized analysis for:
- Concrete sample defects
- Surface irregularities
- Color variations
- Structural issues

**Example:**
```
Upload: Concrete sample with crack
AI: "Quality Control Analysis:
     ISSUES:
     - Small hairline crack (5mm) on surface
     - Slight discoloration in corner
     
     RECOMMENDATIONS:
     - Monitor crack progression
     - Check water-cement ratio
     - Review curing conditions"
```

### Supported Image Formats

- PNG
- JPG/JPEG
- Max size: 10MB
- Resolution: Any (higher is better for OCR)

---

## ✨ Prompt Templates

Save time with pre-built prompt templates!

### Accessing Templates

1. **Click the sparkles icon** ✨ in chat input
2. **Browse categories:**
   - Inventory Management
   - Deliveries
   - Quality Control
   - Reports & Analytics
   - Forecasting
   - Bulk Import

3. **Click a template** to use it
4. **Edit if needed** before sending

### Popular Templates

#### Inventory
```
"Show me all materials that are below minimum stock levels"
"What's the current stock status for all aggregate materials?"
"Generate a reorder list for materials below 20% threshold"
```

#### Deliveries
```
"List all deliveries scheduled for today"
"Show me completed deliveries from the past week"
"What's the status of delivery #[ID]?"
```

#### Quality Control
```
"Show me all failed quality tests from the past month"
"Generate a quality control summary report"
"List all quality tests that need supervisor review"
```

#### Forecasting
```
"Generate a 30-day consumption forecast for cement"
"When will we run out of gravel at current usage rates?"
"Show me material usage trends over the past 3 months"
```

---

## 🛠️ Available Tools

The AI can execute these tools automatically based on your request:

### 📦 Inventory Tools

**`search_materials`**
- Search materials by name
- Check stock levels
- Filter by category

**`create_material`**
- Add new materials to inventory
- Set stock levels and thresholds

**`update_material_quantity`**
- Adjust stock quantities
- Record consumption
- Update prices

### 🚚 Delivery Tools

**`get_delivery_status`**
- Track delivery locations
- Check ETA
- View delivery history

**`calculate_stats`**
- Delivery completion rates
- Volume statistics
- Performance metrics

### 📄 Document Tools

**`search_documents`**
- Find documents by name/category
- Search document content
- Filter by project

**`update_document`**
- Change document metadata
- Update categories
- Rename files

**`delete_document`**
- Remove documents
- Clean up old files

### 🧪 Quality Control Tools

**`get_quality_tests`**
- Retrieve test results
- Filter by status/date
- View pass/fail rates

### 👷 Work Hours Tools

**`log_work_hours`**
- Record employee hours
- Calculate overtime automatically
- Associate with projects

**`get_work_hours_summary`**
- Generate timesheets
- Employee hour reports
- Project time tracking

**`log_machine_hours`**
- Track equipment usage
- Maintenance scheduling
- Machine utilization

### 📊 Analytics Tools

**`generate_forecast`**
- Material consumption predictions
- Reorder recommendations
- Trend analysis

**`calculate_stats`**
- Business KPIs
- Performance metrics
- Custom calculations

---

## 🎛️ Model Selection

Choose the best AI model for your task:

### Available Models

#### Local Models (Faster, Private)

**For Chat & Questions:**
- `qwen3:8b` ⚡ Fast, accurate (default)
- `deepseek-r1:14b` 🧠 Advanced reasoning
- `deepseek-coder:6.7b` 💻 Code & technical

**For Vision & OCR:**
- `granite3.2-vision:2b` 👁️ Fast vision analysis
- `deepseek-ocr:3b` 📄 OCR specialist

#### Cloud Models (Slower, More Powerful)

- `gemini-1.5-flash` ⚡ Fast cloud model
- `gemini-2.0-flash` 🚀 Latest Gemini
- `gemini-1.5-pro` 🧠 Most capable

### How to Switch Models

1. **Look at the top right** of the chat screen
2. **Click the Model dropdown**
3. **Select desired model**
4. **New messages** use the selected model

### Which Model Should I Use?

| Task | Recommended Model |
|------|-------------------|
| General questions | `qwen3:8b` |
| Complex reasoning | `deepseek-r1:14b` |
| Technical questions | `deepseek-coder:6.7b` |
| Image analysis | `granite3.2-vision:2b` |
| Document OCR | `deepseek-ocr:3b` |
| Cloud processing | `gemini-2.0-flash` |

---

## 💡 Tips & Best Practices

### Writing Effective Prompts

✅ **Good Prompts:**
```
"Show me all deliveries for Project Alpha completed in the last 7 days"
"Calculate the total concrete volume delivered this month"
"List materials where current stock is below 30% of minimum threshold"
```

❌ **Poor Prompts:**
```
"deliveries"
"stock"
"help"
```

### Be Specific

**Instead of:** "How much material do we have?"  
**Try:** "How much cement (in kg) is currently in stock?"

**Instead of:** "Show deliveries"  
**Try:** "Show all pending deliveries scheduled for tomorrow"

### Use Natural Language

You don't need special commands - just ask naturally:

✅ "When will we run out of gravel?"  
✅ "What's the status of delivery number 42?"  
✅ "Log 8 hours for John Smith on Project Beta today"

### Break Down Complex Requests

For complex tasks, ask step by step:

1. "Show me all quality tests from last week"
2. "How many tests failed?"
3. "What were the main failure reasons?"

### Review AI Actions

When AI performs actions (like logging hours or updating stock):
- ✅ Review the confirmation message
- ✅ Check the results are correct
- ✅ Ask for corrections if needed

---

## 🔧 Troubleshooting

### Common Issues

#### "Model not available" Error

**Problem:** Selected model isn't installed  
**Solution:**
1. Switch to `qwen3:8b` (default)
2. Or ask admin to install the model

#### Voice Recording Not Working

**Problem:** Microphone access denied  
**Solution:**
1. Check browser microphone permissions
2. Allow microphone access for the site
3. Try refreshing the page

#### Image Upload Fails

**Problem:** Image too large or wrong format  
**Solution:**
1. Check file size (max 10MB)
2. Use PNG, JPG, or JPEG format
3. Compress large images before uploading

#### AI Response is Slow

**Problem:** Large model or complex query  
**Solution:**
1. Switch to a faster model (e.g., `qwen3:8b`)
2. Simplify your question
3. Check server load with admin

#### Transcription Error

**Problem:** Voice not recognized properly  
**Solution:**
1. Speak more clearly
2. Reduce background noise
3. Use shorter recordings
4. Try typing instead

### Getting Help

If you're stuck:

1. **Try Prompt Templates** - Pre-built queries that work
2. **Ask Simpler Questions** - Break down complex requests
3. **Check This Guide** - Reference examples above
4. **Contact Support** - Email support@azvirt.com

---

## 📚 Example Use Cases

### 1. Daily Operations Check

```
Morning Routine:
1. "Show me today's delivery schedule"
2. "What materials are low in stock?"
3. "Any quality tests needing approval?"
```

### 2. Stock Management

```
"Show me cement stock levels"
"When will we need to reorder gravel?"
"Add 1000kg of sand to inventory"
"Generate a 30-day forecast for all materials"
```

### 3. Quality Control

```
Upload concrete sample photo
"Analyze this sample for defects"
"Show all quality tests from today"
"What's our pass rate this month?"
```

### 4. Time Tracking

```
"Log 8 hours for John Smith on Project Alpha today"
"Show work hours summary for this week"
"Log machine hours: Mixer #1 ran for 6 hours on Project Beta"
```

### 5. Document Management

```
Upload invoice photo
"Extract all information from this invoice"
"Find documents for Project Beta"
"Update category for document 'receipt-123' to 'Invoices'"
```

### 6. Reporting

```
"Generate a summary of this week's production"
"What's our delivery completion rate?"
"Show material consumption trends"
"Calculate total concrete delivered this month"
```

---

## 🎓 Advanced Features

### Multi-step Tasks

AI can handle complex, multi-step requests:

```
You: "Find all deliveries from yesterday, calculate total volume, 
      and tell me which materials were used"

AI: [Executes multiple tools automatically]
    - Searches deliveries
    - Calculates volumes
    - Cross-references materials
    - Provides comprehensive report
```

### Context Awareness

AI remembers your conversation:

```
You: "Show me Project Alpha deliveries"
AI: [Shows 5 deliveries for Project Alpha]

You: "What about quality tests for those?"
AI: [Knows you mean Project Alpha]
    [Shows quality tests for those 5 deliveries]

You: "Any failures?"
AI: [Filters for failed tests in that context]
```

### Natural Follow-ups

Continue the conversation naturally:

```
You: "How much cement do we have?"
AI: "You have 2,500 kg of cement in stock"

You: "Is that enough for this week?"
AI: [Calculates based on forecast]
    "Based on average consumption of 350 kg/day, 
     you have about 7 days of cement supply"

You: "When should I reorder?"
AI: "Recommend reordering in 3-4 days to maintain buffer"
```

---

## 🔒 Privacy & Security

### Your Data is Safe

- ✅ **Local Processing** - Most models run on local servers
- ✅ **Authenticated Access** - Only logged-in users can access
- ✅ **Private Conversations** - Your chats are not shared
- ✅ **Secure Storage** - All data encrypted at rest

### What AI Can Access

The AI can only access:
- ✅ Data you have permission to view
- ✅ Your own work records
- ✅ Business data within your role

The AI cannot:
- ❌ Access other users' private data
- ❌ Make changes without permission
- ❌ Delete critical records without confirmation

---

## 📞 Support

### Need Help?

- 📧 **Email:** support@azvirt.com
- 📱 **Phone:** +387 XX XXX XXX
- 💬 **Chat:** Use the help widget
- 📖 **Docs:** https://docs.azvirt.com

### Feedback

We'd love to hear from you!
- 💡 Feature requests
- 🐛 Bug reports
- ⭐ Success stories
- 💬 General feedback

Email: feedback@azvirt.com

---

**Version:** 1.0  
**Last Updated:** February 5, 2025  
**Document:** AI_ASSISTANT_USER_GUIDE.md

---

🎉 **Happy chatting with your AI Assistant!** 🤖