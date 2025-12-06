# AI Features Documentation

## Overview

The YNM Safety CRM system includes a comprehensive AI-powered RAG (Retrieval-Augmented Generation) chatbot that allows users to query their CRM data using natural language. The system uses Google Gemini AI to understand questions, generate SQL queries, and provide intelligent responses.

---

## 🤖 How the RAG Chatbot Works

### Architecture

The RAG (Retrieval-Augmented Generation) system consists of several key components:

1. **Intent Classifier** (`lib/ai/intentClassifier.ts`)
   - Analyzes user questions to determine intent
   - Categorizes queries (CONTACT_QUERY, ACCOUNT_QUERY, ACTIVITY_QUERY, etc.)
   - Identifies relevant database tables
   - Provides confidence scores

2. **Dynamic Query Builder** (`lib/ai/dynamicQueryBuilder.ts`)
   - Converts intent into SQL queries
   - Handles JOINs automatically
   - Applies role-based access control (RLS)
   - Generates parameterized queries (SQL injection safe)

3. **Query Execution** (`lib/ai/ragEngine.ts`)
   - Executes SQL queries with proper security
   - Applies user context filters
   - Handles caching for performance
   - Formats results for AI processing

4. **AI Response Generation** (`lib/ai/ragEngine.ts`)
   - Uses Gemini AI to generate natural language responses
   - Provides context-aware answers
   - Includes data citations
   - Supports both COACH and QUERY modes

5. **Conversation Memory** (`lib/ai/conversationMemory.ts`)
   - Maintains conversation history
   - Enables follow-up questions
   - Provides context for multi-turn conversations

### Flow Diagram

```
User Question
    ↓
Intent Classification (Gemini AI)
    ↓
Query Building (Dynamic SQL Generation)
    ↓
Query Execution (Supabase with RLS)
    ↓
Data Formatting
    ↓
AI Response Generation (Gemini AI)
    ↓
Formatted Answer + Data Table
```

---

## 💬 How to Ask Questions Effectively

### Best Practices

1. **Be Specific**
   - ✅ Good: "Show me all contacts from accounts in Mumbai"
   - ❌ Bad: "Show contacts"

2. **Use Natural Language**
   - ✅ Good: "What are my top 5 accounts by engagement score?"
   - ❌ Bad: "SELECT * FROM accounts LIMIT 5"

3. **Include Context**
   - ✅ Good: "Show me my follow-ups due this week"
   - ❌ Bad: "Show follow-ups"

4. **Ask Follow-up Questions**
   - ✅ Good: "What about last month?" (after asking about this month)
   - ✅ Good: "Which ones need attention?" (after getting a list)

5. **Use Time References**
   - ✅ Good: "Activities in the last 7 days"
   - ✅ Good: "Accounts created this year"
   - ✅ Good: "Follow-ups due today"

### Question Patterns

#### Contact Queries
- "How many contacts do I have?"
- "Show me contacts from [Account Name]"
- "List all contacts in [City]"
- "Find contacts with email containing [domain]"

#### Account Queries
- "What are my top accounts by engagement?"
- "Show me accounts with low engagement"
- "List all accounts assigned to me"
- "Which accounts haven't been contacted in 30 days?"

#### Activity Queries
- "What activities did I do this week?"
- "Show me all calls made last month"
- "List follow-ups due today"
- "What's my activity breakdown by type?"

#### Aggregation Queries
- "What's the total value of my pipeline?"
- "How many leads did I convert this month?"
- "What's my average engagement score?"
- "Count activities by type"

#### Performance Queries
- "How am I performing compared to last month?"
- "What's my win rate?"
- "Show me my sales pipeline"
- "What are my top performing accounts?"

---

## 📊 Supported Query Types

### 1. Contact Queries
**Intent**: `CONTACT_QUERY`
- List contacts
- Filter by account, city, email
- Search contacts
- Contact details

**Example Questions**:
- "How many contacts do I have?"
- "Show contacts from ABC Company"
- "Find contacts in Mumbai"

### 2. Account Queries
**Intent**: `ACCOUNT_QUERY`
- List accounts
- Filter by engagement score
- Account details
- Account assignments

**Example Questions**:
- "Show me all my accounts"
- "Which accounts have low engagement?"
- "List accounts assigned to [Employee]"

### 3. Activity Queries
**Intent**: `ACTIVITY_QUERY`
- Activity history
- Filter by type, date, employee
- Activity statistics
- Follow-up tracking

**Example Questions**:
- "What activities did I do today?"
- "Show me all calls this week"
- "List follow-ups due tomorrow"

### 4. Quotation Queries
**Intent**: `QUOTATION_QUERY`
- Quotation list
- Filter by status, date, customer
- Quotation statistics
- Value calculations

**Example Questions**:
- "What quotations are pending?"
- "Show me quotations from last month"
- "What's the total value of my quotations?"

### 5. Lead Queries
**Intent**: `LEAD_QUERY`
- Lead list
- Filter by status, source, employee
- Lead conversion tracking
- Lead statistics

**Example Questions**:
- "How many leads do I have?"
- "Show me new leads"
- "What's my lead conversion rate?"

### 6. Performance Queries
**Intent**: `PERFORMANCE_QUERY`
- Employee performance metrics
- Comparison queries
- Trend analysis
- Win rates

**Example Questions**:
- "How am I performing this month?"
- "What's my win rate?"
- "Compare my performance to last month"

### 7. Aggregation Queries
**Intent**: `AGGREGATION_QUERY`
- COUNT, SUM, AVG, MIN, MAX
- Group by operations
- Statistical analysis
- Summary reports

**Example Questions**:
- "What's the total value of my pipeline?"
- "Count activities by type"
- "What's the average engagement score?"

### 8. Comparison Queries
**Intent**: `COMPARISON_QUERY`
- Compare periods
- Compare employees
- Compare accounts
- Trend analysis

**Example Questions**:
- "Compare this month to last month"
- "How do I compare to other employees?"
- "Which accounts improved this quarter?"

### 9. Trend Queries
**Intent**: `TREND_QUERY`
- Time series analysis
- Growth trends
- Pattern identification
- Historical comparisons

**Example Questions**:
- "Show me activity trends over the last 3 months"
- "What's the growth trend in my pipeline?"
- "How has engagement changed over time?"

---

## 🎯 Query Modes

### COACH Mode
**Purpose**: Get coaching advice and strategic guidance

**Features**:
- Performance analysis
- Improvement recommendations
- Strategic advice
- Actionable tips

**Example Questions**:
- "How can I improve my performance?"
- "Which accounts need attention?"
- "What should I focus on today?"
- "Give me tips to close more deals"

### QUERY Mode
**Purpose**: Query CRM data and get specific answers

**Features**:
- Data retrieval
- SQL query generation
- Data tables
- Statistical analysis

**Example Questions**:
- "How many contacts do I have?"
- "Show my follow-ups due today"
- "What's my pipeline value?"
- "List all my sub-accounts"

---

## ⚠️ Limitations and Best Practices

### Limitations

1. **Data Access**
   - Users can only query data they have permission to access
   - Role-based access control (RLS) is enforced
   - Admin users see all data
   - Employees see only their assigned data

2. **Query Complexity**
   - Very complex queries may take longer
   - Some edge cases may not be supported
   - Multi-table joins are handled automatically

3. **Real-time Data**
   - Data is cached for performance (1-10 minutes depending on type)
   - Recent changes may not appear immediately
   - Use "Refresh" if you need latest data

4. **AI Understanding**
   - Ambiguous questions may need clarification
   - Very specific technical queries may not be understood
   - Try rephrasing if the answer isn't what you expected

### Best Practices

1. **Start Simple**
   - Begin with basic questions
   - Build up to more complex queries
   - Use follow-up questions for refinement

2. **Be Patient**
   - Complex queries may take a few seconds
   - The system is processing and analyzing data
   - Streaming responses show progress

3. **Use Context**
   - Reference previous questions in follow-ups
   - The system remembers conversation history
   - Use specific names, dates, and filters

4. **Review Results**
   - Check the generated SQL query (click "Show SQL")
   - Verify data accuracy
   - Use export features for further analysis

5. **Provide Feedback**
   - Use thumbs up/down for responses
   - Report issues to administrators
   - Help improve the system

---

## 🔍 Advanced Features

### Query Suggestions
- Personalized suggestions based on your data
- Role-based recommendations
- Trending queries from other users
- Action items and insights

### Streaming Responses
- Real-time updates as AI processes
- Progress indicators
- Faster perceived response time
- Better user experience

### Report Generation
- Convert query results to professional reports
- Executive summaries
- Detailed analysis
- Action items with priorities

### Query Caching
- Automatic caching for performance
- Faster responses for repeated queries
- Smart cache invalidation
- Configurable TTL by data type

---

## 📚 Example Queries

See `docs/EXAMPLE_QUERIES.md` for a comprehensive list of example queries organized by category.

---

## 🆘 Troubleshooting

### Common Issues

1. **"I don't understand your question"**
   - Try rephrasing more clearly
   - Be more specific
   - Check if you're using the right mode (COACH vs QUERY)

2. **"No results found"**
   - Check your data access permissions
   - Verify the query parameters
   - Try a broader search

3. **Slow responses**
   - Complex queries take time
   - Check your internet connection
   - Try a simpler question first

4. **Incorrect results**
   - Review the generated SQL query
   - Check your data permissions
   - Report the issue to administrators

---

## 📞 Support

For questions or issues:
- Contact your system administrator
- Check the AI monitoring dashboard (Admin only)
- Review query logs for debugging

---

**Last Updated**: December 2024  
**AI Provider**: Google Gemini 1.5 Pro  
**System Version**: 2.0.0

