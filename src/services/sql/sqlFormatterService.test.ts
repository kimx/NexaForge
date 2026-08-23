import { describe, expect, it, vi } from "vitest";
import { compactSql, formatSql } from "./sqlFormatterService";

describe("compactSql", () => {
  it("collapses layout whitespace without changing quoted values or identifiers", () => {
    expect(
      compactSql("SELECT  'two  spaces'\nFROM  [user table]\nWHERE `display name` = \"Ada  Lovelace\"")
    ).toBe("SELECT 'two  spaces' FROM [user table] WHERE `display name` = \"Ada  Lovelace\"");
  });

  it("preserves PostgreSQL dollar-quoted content", () => {
    expect(compactSql("SELECT  $$line one\nline  two$$\nFROM  users")).toBe(
      "SELECT $$line one\nline  two$$ FROM users"
    );
    expect(compactSql("SELECT  $tag$a  b$tag$\nFROM  users")).toBe(
      "SELECT $tag$a  b$tag$ FROM users"
    );
  });

  it("keeps the newline that ends a line comment", () => {
    expect(compactSql("SELECT  1  -- keep this comment\nFROM  users")).toBe(
      "SELECT 1 -- keep this comment\nFROM users"
    );
  });

  it("preserves block comment contents while compacting around them", () => {
    expect(compactSql("SELECT  /* keep  spacing */  1\nFROM users")).toBe(
      "SELECT /* keep  spacing */ 1 FROM users"
    );
  });
});

describe("formatSql", () => {
  it("maps the supported SQL Server options to the formatter", async () => {
    const formatter = vi.fn(() => "SELECT\n  *\nFROM\n  users");

    const result = await formatSql(
      "select * from users",
      {
        dialect: "transactsql",
        keywordCase: "upper",
        indent: 2,
        mode: "format",
      },
      { format: formatter }
    );

    expect(result).toBe("SELECT\n  *\nFROM\n  users");
    expect(formatter).toHaveBeenCalledWith("select * from users", {
      language: "transactsql",
      keywordCase: "upper",
      tabWidth: 2,
      useTabs: false,
    });
  });

  it("compacts formatted SQL in minify mode", async () => {
    const result = await formatSql(
      "select 'a  b' from users",
      {
        dialect: "postgresql",
        keywordCase: "preserve",
        indent: "tab",
        mode: "minify",
      },
      { format: () => "select\n\t'a  b'\nfrom\n\tusers" }
    );

    expect(result).toBe("select 'a  b' from users");
  });

  it("rejects blank SQL before loading the formatter", async () => {
    const formatter = vi.fn(() => "unused");

    await expect(
      formatSql(
        "   ",
        { dialect: "mysql", keywordCase: "lower", indent: 4, mode: "format" },
        { format: formatter }
      )
    ).rejects.toMatchObject({ code: "empty-input" });
    expect(formatter).not.toHaveBeenCalled();
  });
});
