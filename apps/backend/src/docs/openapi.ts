const openapiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Financial Dashboard API",
    version: "1.0.0",
    description: "Authentication, transaction, analytics, and CSV export APIs.",
  },
  servers: [{ url: "http://localhost:5000", description: "Local development server" }],
  tags: [
    { name: "Health", description: "Service status" },
    { name: "Authentication", description: "User sessions and profiles" },
    { name: "Transactions", description: "Transaction listing" },
    { name: "Analytics", description: "Aggregated financial data" },
    { name: "Export", description: "CSV exports" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Access token returned by signup, signin, or refresh-token.",
      },
      refreshTokenCookie: {
        type: "apiKey",
        in: "cookie",
        name: "refreshToken",
        description: "HTTP-only refresh token cookie set by auth endpoints.",
      },
    },
    parameters: {
      search: { name: "search", in: "query", schema: { type: "string" } },
      startDate: { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
      endDate: { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          _id: { type: "string", example: "65f1c2e8a4b1c2e8a4b1c2e8" },
          name: { type: "string", example: "Lokesh Patil" },
          email: { type: "string", format: "email", example: "user@example.com" },
        },
        required: ["_id", "name", "email"],
      },
      Transaction: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1001 },
          user_id: { type: "string", example: "user_001" },
          user_profile: { type: "string", example: "https://example.com/avatar.png" },
          date: { type: "string", format: "date-time" },
          amount: { type: "number", format: "double", example: 1250.5 },
          category: { type: "string", enum: ["Revenue", "Expense"] },
          status: { type: "string", enum: ["Paid", "Pending", "Failed"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ApiResponse: {
        type: "object",
        properties: {
          statusCode: { type: "integer", example: 200 },
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Request completed successfully" },
          data: { type: "object", additionalProperties: true },
        },
        required: ["statusCode", "success", "message", "data"],
      },
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Invalid Credentials" },
        },
        required: ["success", "message"],
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        responses: {
          "200": {
            description: "API is running",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } },
          },
        },
      },
    },
    "/api/v0/auth/signup": {
      post: {
        tags: ["Authentication"],
        summary: "Create a user account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Lokesh Patil" },
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", format: "password", minLength: 6, example: "strong-password" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Registration successful", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "400": { description: "Missing required fields", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Email already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/v0/auth/signin": {
      post: {
        tags: ["Authentication"],
        summary: "Sign in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", format: "password", example: "strong-password" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Signed in successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/v0/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Log out the current user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Logged out successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/v0/auth/refresh-token": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh access and refresh tokens",
        security: [{ refreshTokenCookie: [] }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object", properties: { refreshToken: { type: "string" } } } } },
        },
        responses: {
          "200": { description: "Tokens refreshed successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "401": { description: "Invalid or expired refresh token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/v0/auth/profile": {
      get: {
        tags: ["Authentication"],
        summary: "Get the current user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Profile returned", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/v0/transactions": {
      get: {
        tags: ["Transactions"],
        summary: "List transactions with filtering and pagination",
        parameters: [
          { $ref: "#/components/parameters/search" },
          { $ref: "#/components/parameters/startDate" },
          { $ref: "#/components/parameters/endDate" },
          { name: "category", in: "query", schema: { type: "string", enum: ["Revenue", "Expense"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["Paid", "Pending", "Failed"] } },
          { name: "minAmount", in: "query", schema: { type: "number" } },
          { name: "maxAmount", in: "query", schema: { type: "number" } },
          { name: "user_id", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["date", "amount", "id", "createdAt"], default: "date" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated transactions",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, total: { type: "integer" }, page: { type: "integer" }, limit: { type: "integer" }, totalPages: { type: "integer" }, data: { type: "array", items: { $ref: "#/components/schemas/Transaction" } } } } } },
          },
        },
      },
    },
    "/api/v0/analytics/summary": {
      get: {
        tags: ["Analytics"],
        summary: "Get revenue, expense, and status summary",
        parameters: [{ $ref: "#/components/parameters/startDate" }, { $ref: "#/components/parameters/endDate" }],
        responses: { "200": { description: "Analytics summary", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } } },
      },
    },
    "/api/v0/analytics/trends": {
      get: {
        tags: ["Analytics"],
        summary: "Get time-series transaction trends",
        parameters: [
          { name: "interval", in: "query", schema: { type: "string", enum: ["day", "week", "month", "year"], default: "month" } },
          { $ref: "#/components/parameters/startDate" },
          { $ref: "#/components/parameters/endDate" },
          { name: "category", in: "query", schema: { type: "string", enum: ["Revenue", "Expense"] } },
          { name: "fill", in: "query", schema: { type: "boolean", default: true } },
        ],
        responses: { "200": { description: "Trend data", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } } },
      },
    },
    "/api/v0/analytics/categories": {
      get: {
        tags: ["Analytics"],
        summary: "Get category and status breakdowns",
        parameters: [
          { $ref: "#/components/parameters/startDate" },
          { $ref: "#/components/parameters/endDate" },
          { name: "groupBy", in: "query", schema: { type: "string", enum: ["category", "status", "both"], default: "both" } },
        ],
        responses: { "200": { description: "Category breakdown", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } } },
      },
    },
    "/api/v0/export/transactions": {
      get: {
        tags: ["Export"],
        summary: "Export filtered transactions as CSV",
        parameters: [
          { $ref: "#/components/parameters/search" },
          { $ref: "#/components/parameters/startDate" },
          { $ref: "#/components/parameters/endDate" },
          { name: "category", in: "query", schema: { type: "string", enum: ["Revenue", "Expense"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["Paid", "Pending", "Failed"] } },
          { name: "minAmount", in: "query", schema: { type: "number" } },
          { name: "maxAmount", in: "query", schema: { type: "number" } },
          { name: "user_id", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["date", "amount", "id", "createdAt"], default: "date" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          { name: "columns", in: "query", description: "Comma-separated columns. Defaults to id,user_id,date,amount,category,status.", schema: { type: "string", example: "id,date,amount,status" } },
        ],
        responses: {
          "200": { description: "CSV file", content: { "text/csv": { schema: { type: "string", format: "binary" } } } },
          "400": { description: "No valid columns selected", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "No matching transactions", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
};

export default openapiDocument;