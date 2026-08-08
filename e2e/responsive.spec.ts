import { test,expect } from "@playwright/test";
test.use({viewport:{width:390,height:844}});
test("login remains usable on mobile",async({page})=>{await page.goto("/login");await expect(page.locator("body")).not.toHaveCSS("overflow-x","scroll");await expect(page.getByRole("button",{name:/sign in/i})).toBeVisible();});
