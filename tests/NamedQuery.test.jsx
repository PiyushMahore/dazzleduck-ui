import { describe, it, expect, beforeEach, vi } from "vitest";
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

const withJsonError = (message, status = 500) => {
    const error = new Error(message);
    error.response = { status, data: message };
    return error;
};

const isMethod = (config, method) =>
    String(config.method || "").toLowerCase() === method.toLowerCase();

describe("Named Query Tab", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Cookies.remove("jwtToken");
        Cookies.remove("connectionInfo");
    });

    it("auto-fetches and renders named query groups after connect", async () => {
        axios.post.mockResolvedValueOnce(loginResponse("token-groups"));
        axios.mockImplementation(async (config) => {
            if (isMethod(config, "get") && config.url === `${SERVER_URL}/v1/named-query/groups`) {
                return {
                    data: [
                        { query_group: "sales", ids: [1, 2] },
                        { query_group: "finance", ids: [3] },
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

        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            method: "GET",
            url: `${SERVER_URL}/v1/named-query/groups`,
            headers: expect.objectContaining({
                Authorization: "Bearer token-groups",
            }),
        }));
    });

    it("opens a group and renders its named queries", async () => {
        axios.post.mockResolvedValueOnce(loginResponse("token-open-group"));
        axios.mockImplementation(async (config) => {
            if (isMethod(config, "get") && config.url === `${SERVER_URL}/v1/named-query/groups`) {
                return {
                    data: [{ query_group: "sales", ids: [1] }],
                    headers: { "content-type": "application/json" },
                };
            }

            if (isMethod(config, "get") && config.url === `${SERVER_URL}/v1/named-query?offset=0&limit=200&group=sales`) {
                return {
                    data: [
                        {
                            name: "sales_summary",
                            description: "Summary for the selected period",
                            parameterDescriptions: { limit: "number" },
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
            fireEvent.click(screen.getByRole("button", { name: "Open" }));
        });

        expect(await screen.findByText("sales_summary")).toBeInTheDocument();
        expect(screen.getByText("Summary for the selected period")).toBeInTheDocument();
        expect(screen.getByText("1 param(s)")).toBeInTheDocument();
    });
});
