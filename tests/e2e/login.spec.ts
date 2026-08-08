import { test, expect } from "@playwright/test";
test("login page exposes admin sign in",async({page})=>{await page.goto("/login");await expect(page.getByRole("heading",{name:"Welcome back"})).toBeVisible();await expect(page.getByRole("button",{name:"Sign in"})).toBeVisible();});
