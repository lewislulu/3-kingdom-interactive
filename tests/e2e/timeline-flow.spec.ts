import { test, expect } from "@playwright/test";

test("prologue -> story -> event drawer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "三国演义人物命运时空图谱" })).toBeVisible();

  await page.getByRole("link", { name: "进入故事主工作台" }).click();
  await expect(page).toHaveURL(/\/story/);

  await expect(page.getByRole("heading", { name: /三国演义/ })).toBeVisible();
  await expect(page.getByText("本卷出场人物")).toBeVisible();

  await page.getByRole("button", { name: "第一卷：乱世狂澜" }).click();
  await page.locator(".sample-node").first().click();
  await expect(page.getByText("事件详情")).toBeVisible();
  await expect(page.getByText("事件背景")).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByText("事件详情")).toHaveCount(0);
});
