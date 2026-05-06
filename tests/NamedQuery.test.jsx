import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { QueryDashboardProvider } from "../src/context/QueryDashboardContext";
import QueryDashboard from "../src/querydashboard/QueryDashboard";

vi.mock("axios", () => {
    const mockAxios = vi.fn();
    mockAxios.post = vi.fn();
    mockAxios.get = vi.fn();
    return { default: mockAxios };
});

const SERVER_URL = "http://localhost:8081";
const PASSWORD = "admin";

const renderDashboard = () =>
    render(
        <QueryDashboardProvider>
            <QueryDashboard />
        </QueryDashboardProvider>
    );

const connect = async ({ username = "admin" } = {}) => {
    fireEvent.change(screen.getByPlaceholderText(/http:\/\/localhost:8081/i), {
        target: { value: SERVER_URL },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter username/i), {
        target: { value: username },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter password/i), {
        target: { value: PASSWORD },
    });

    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));
    });

    await waitFor(() => {
        expect(Cookies.get("jwtToken")).toBeDefined();
    });
};

const openNamedQueryTab = async () => {
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /named queries/i }));
    });
};

const loginResponse = (token) => ({
    data: {
        tokenType: "Bearer",
        accessToken: token,
    },
});

const isMethod = (config, method) =>
    String(config.method || "").toLowerCase() === method.toLowerCase();

const mockNamedQueryResponse = () => [
    {
        id: 1,
        name: "sales_summary",
        description: "Summary for the selected period",
        parameterDescriptions: [
            { key: "limit", value: "number" }
        ],
        preferred_display: "table",
        query_group: "sales"
    },
    {
        id: 2,
        name: "finance_report",
        description: "Financial report",
        parameterDescriptions: [],
        preferred_display: "table",
        query_group: "finance"
    },
    {
        id: 3,
        name: "uncategorized_query",
        description: "Query without group",
        parameterDescriptions: [],
        preferred_display: "line",
        query_group: null
    },
];

const mockExecuteQueryResponse = () => {
    const data = [
        { date: "2024-01-01", revenue: 1000, cost: 800 },
        { date: "2024-01-02", revenue: 1200, cost: 900 },
        { date: "2024-01-03", revenue: 1500, cost: 1000 },
    ];

    // Convert to Arrow format base64
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(jsonStr);

    return {
        data: new ArrayBuffer(base64.length),
        headers: { "content-type": "application/vnd.apache.arrow.stream" }
    };
};

describe("Named Query Tab", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Cookies.remove("jwtToken");
        Cookies.remove("connectionInfo");
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("auto-fetches and renders named query groups after connect", async () => {
        axios.post.mockResolvedValueOnce(loginResponse("token-groups"));
        axios.mockImplementation(async (config) => {
            if (isMethod(config, "get") && config.url === `${SERVER_URL}/v1/named-query?offset=0&limit=1000`) {
                return {
                    data: mockNamedQueryResponse(),
                    headers: { "content-type": "application/json" },
                };
            }
            throw new Error(`Unhandled request: ${config.method} ${config.url}`);
        });

        renderDashboard();
        await connect();
        await openNamedQueryTab();

        expect(await screen.findByText("sales")).toBeInTheDocument();
        expect(screen.getByText("finance")).toBeInTheDocument();
        expect(screen.getByText("uncategorized")).toBeInTheDocument();

        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            method: "GET",
            url: `${SERVER_URL}/v1/named-query?offset=0&limit=1000`,
            headers: expect.objectContaining({
                Authorization: "Bearer token-groups",
            }),
        }));
    });

    it("opens a group and renders its named queries", async () => {
        axios.post.mockResolvedValueOnce(loginResponse("token-open-group"));
        axios.mockImplementation(async (config) => {
            if (isMethod(config, "get") && config.url === `${SERVER_URL}/v1/named-query?offset=0&limit=1000`) {
                return {
                    data: [
                        {
                            id: 1,
                            name: "sales_summary",
                            description: "Summary for the selected period",
                            parameterDescriptions: [
                                { key: "limit", value: "number" }
                            ],
                            preferred_display: "table",
                            query_group: "sales"
                        },
                        {
                            id: 4,
                            name: "sales_monthly",
                            description: "Monthly sales data",
                            parameterDescriptions: [
                                { key: "months", value: "number" },
                                { key: "limit", value: "number" }
                            ],
                            preferred_display: "line",
                            query_group: "sales"
                        },
                    ],
                    headers: { "content-type": "application/json" },
                };
            }

            throw new Error(`Unhandled request: ${config.method} ${config.url}`);
        });

        renderDashboard();
        await connect();
        await openNamedQueryTab();

        expect(await screen.findByText("sales")).toBeInTheDocument();

        await act(async () => {
            const openButtons = screen.getAllByRole("button", { name: "Open" });
            // Click the first Open button (which should be the named query group button)
            fireEvent.click(openButtons[0]);
        });

        expect(await screen.findByText("sales_summary")).toBeInTheDocument();
        expect(screen.getByText("Summary for the selected period")).toBeInTheDocument();
        expect(screen.getByText("sales_monthly")).toBeInTheDocument();
        expect(screen.getByText("Monthly sales data")).toBeInTheDocument();
    });

    it("handles fetch errors gracefully", async () => {
        axios.post.mockResolvedValueOnce(loginResponse("token-error"));
        axios.mockImplementation(async (config) => {
            if (isMethod(config, "get") && config.url.includes("/v1/named-query")) {
                throw new Error("Network error: Failed to fetch named queries");
            }
            throw new Error(`Unhandled request: ${config.method} ${config.url}`);
        });

        renderDashboard();
        await connect();
        await openNamedQueryTab();

        await waitFor(() => {
            expect(screen.queryByText("sales")).not.toBeInTheDocument();
        });
    });

    it("handles empty named query response", async () => {
        axios.post.mockResolvedValueOnce(loginResponse("token-empty"));
        axios.mockImplementation(async (config) => {
            if (isMethod(config, "get") && config.url === `${SERVER_URL}/v1/named-query?offset=0&limit=1000`) {
                return {
                    data: [],
                    headers: { "content-type": "application/json" },
                };
            }
            throw new Error(`Unhandled request: ${config.method} ${config.url}`);
        });

        renderDashboard();
        await connect();
        await openNamedQueryTab();

        await waitFor(() => {
            expect(screen.queryByText("sales")).not.toBeInTheDocument();
        });
    });

    it("filters queries by text", async () => {
        axios.post.mockResolvedValueOnce(loginResponse("token-filter"));
        axios.mockImplementation(async (config) => {
            if (isMethod(config, "get") && config.url === `${SERVER_URL}/v1/named-query?offset=0&limit=1000`) {
                return {
                    data: [
                        {
                            id: 1,
                            name: "sales_summary",
                            description: "Summary for the selected period",
                            parameterDescriptions: [
                                { key: "limit", value: "number" }
                            ],
                            preferred_display: "table",
                            query_group: "sales"
                        },
                        {
                            id: 2,
                            name: "sales_monthly",
                            description: "Monthly sales data",
                            parameterDescriptions: [
                                { key: "months", value: "number" },
                                { key: "limit", value: "number" }
                            ],
                            preferred_display: "line",
                            query_group: "sales"
                        },
                        {
                            id: 3,
                            name: "finance_report",
                            description: "Financial report",
                            parameterDescriptions: [],
                            preferred_display: "table",
                            query_group: "finance"
                        },
                    ],
                    headers: { "content-type": "application/json" },
                };
            }
            throw new Error(`Unhandled request: ${config.method} ${config.url}`);
        });

        renderDashboard();
        await connect();
        await openNamedQueryTab();

        expect(await screen.findByText("sales")).toBeInTheDocument();
        expect(screen.getByText("finance")).toBeInTheDocument();

        await act(async () => {
            const openButtons = screen.getAllByRole("button", { name: "Open" });
            // Click the first Open button (which should be the named query group button)
            fireEvent.click(openButtons[0]);
        });

        // After opening the sales group, only sales queries should be visible
        expect(await screen.findByText("sales_summary")).toBeInTheDocument();
        expect(screen.getByText("sales_monthly")).toBeInTheDocument();
        expect(screen.queryByText("finance_report")).not.toBeInTheDocument();

        // Filter for "summary" - only matching queries should remain
        fireEvent.change(screen.getByPlaceholderText(/filter queries.../i), {
            target: { value: "summary" },
        });

        await waitFor(() => {
            expect(screen.getByText("sales_summary")).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.queryByText("sales_monthly")).not.toBeInTheDocument();
        });
    });

    it("displays connection required message when not connected", async () => {
        axios.post.mockImplementation(async () => {
            throw new Error("Not connected");
        });

        renderDashboard();

        // Open named query tab without connecting
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /named queries/i }));
        });

        await waitFor(() => {
            expect(screen.getByText(/connection required/i)).toBeInTheDocument();
        });
    });
});
