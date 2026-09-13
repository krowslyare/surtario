import { test, expect } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test.beforeEach(async ({context}) => { await connectOnlyToLocalBackend(context); });

test("US example keeps USD and pounds through study recovery and purchase planning", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/?view=market");
  await expect(page.locator("html")).toHaveAttribute("lang","en");
  await page.getByRole("button",{name:"Explore rice example"}).click();
  await expect(page.getByRole("heading",{name:"Rice in Portland, OR, US",exact:true})).toBeVisible();
  const cards=page.getByRole("article");
  await expect(cards).toHaveCount(4);
  await expect(cards.first()).toContainText("USD 0.80");
  await cards.nth(0).getByRole("button",{name:"Add to study"}).click();
  await cards.nth(1).getByRole("button",{name:"Add to study"}).click();
  await page.getByRole("button",{name:"Save study",exact:true}).click();
  await expect(page.getByRole("region",{name:"Saved studies"}).getByRole("status")).toHaveText("Study saved with 2 options.");
  await page.reload();
  await page.getByRole("button",{name:/Saved \(1\)/}).click();
  await page.getByRole("dialog").getByRole("button",{name:"Open study"}).click();
  await page.getByRole("button",{name:"Plan purchase",exact:true}).click();
  const dialog=page.getByRole("dialog");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button",{name:"Enter quantity and terms"}).click();
  await page.getByLabel("Required quantity").fill("40");
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
  await expect(page.getByTestId("total-1")).toHaveText("Pending");
  await expect(page.getByRole("region",{name:"Purchasing advisor"})).toBeVisible();
  await expect(page.locator('#comparison')).toContainText('lb');
  await expect(page.locator('#comparison')).not.toContainText('S/');
  expect(errors).toEqual([]);
});
