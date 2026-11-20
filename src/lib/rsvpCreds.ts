import "server-only";
/**
 * The Google service account that writes the RSVPs (used when GOOGLE_SA_EMAIL /
 * GOOGLE_SA_PRIVATE_KEY aren't set). Kept here on purpose while the repository is private:
 * anyone who can read this file can edit every sheet shared with this account. If the
 * repository is ever made public, move these into Vercel's environment variables and
 * create a new key for the account (deleting this one).
 */
export const BUILT_IN_SA = {
  email: "nova-automation-sheet@possible-maxim-480812-u3.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCqKQ/qmMvTyX5L\nX+uSSB1Nw3nKwHhlCcvL/UUtA5DV5hv7RV0Ss7We7ASFvRcu/nN8MgpqguBbsHh1\nHeavXTidY6mswvBDiyvMMrVe/3GEjvmQL4A+W2BK2Yl7f6wJ6tSkzP0u+X5fFxZ3\nMoCxBlS+P8bz9IKyU+PRs7a9IrzoG3eZL3zncqlqQumcLI9DHi3Pj8uuCsutuu2B\nXB+TlAAOmadlkhO35dtBtwjzv3jGzgczuxCWOS1WrBNspjVzf6UW80HJyti8cdN0\nACoqON0M83TgMMyi4ifz08jAhUmzH0bosEWySV3zwRjT1vHqo8khXxZdBEmcZ20g\nyDHOc6EbAgMBAAECggEAFw6uXfMrd3zPtMYAJVfJRL7Os5cmGUbdCzy8EW/wwdNH\nCmLpTD32x9yidj7bs9395x/ewnUOks4UXIZbOnsOz2DwXn0h0n06x5Y9dmx1xOkc\nzxlorspx/2J/2zC/Lq7X9qbiTem34om93RQGVTaO6CK7QlZpGWH9tm48Pl/FKkxJ\n4CEQayVaDSt3T4zElDINoNVpR2hESDo9l0RQuN2+vta1pjlyUigE4Zr0mPwJ1WKs\nGIIn+AD45b3z5euy1S13x0NHbaBzkddRREO/jVunlnjeHZbyprMBUfzyDeSvDpX0\n0hjB3eDyp2rfsMVUejQzvzpzYilbjIhMzZxJ549OkQKBgQDcbqvtTw7eVagAayRm\nD049hYhQGsXnyTLMgmG03rDrG2g51eUi2OjXEjoTvmgWBmQmr9BtX+xKgLXBgjIH\n9T6SvAIibXrh7hKZh6phl9DTdnltf0xTXcGoY3RcMY6j/KMZOr13fvzb2+1f3uc6\nx5H/fXDdFXYtoMkWHiv8CJ8hqwKBgQDFndMQolsydEg4evT8tWpircUtSSreQdSR\nyECgNGQF0DK5vTDhuCmneT9KZP0iDRgCH2OKHQj1JjiwyjGB6s8MBWGOuQnddWZq\nYR0ZndSWfdSotg+FK+JcVlmvrD67LmuXULRhlwgsHqw2MUG4vGVuY8x6cK9BKKL0\n/GGAxWfuUQKBgGyky246MfzZQOV76UO4NXrTDr1UhMhZ/QSZGmkX/SDTsEoZJ0dG\nm3QtUpyakxiP69q5esP9rCuIRozqi5gqgr21lmO7i/5A5b/wAsT5G36t/Ok//bF1\nG1bQNfCeqEwg3442yl1UJHKEcfl3loX9CPNgszj0M/wHLDUPh+Q/p5bjAoGAJGkG\n2XrAiNRJ9jYZa3JVjqbrvINNpbPFYbLezWW5xCRvJC/KkNwouJWrZp6i0SJOeR2l\nbm4ZF2oaaeBnLMPBsDpRlkVbnvUhkJoiDXU6FRxMEWWyCFxkkZTLY4W97SkJY9DX\n219DfzWLj1SWAl6b5bH3m9ulPsEo/TB/GoXEt3ECgYEAyLBlT1F72rseMoFfj9ES\nKkaLFliwV/J+uVVrnk1CcczkTlUc4vwy68E0+FpmNfbSJRsGolCk2Suh5m/04+Ng\n1B/PMbiRH/U3qcBZIo5zD/VujWWwavFWvzADctXvuWQuBMyyQ3KyPn3frLPnykbG\nOYoOVCflKkw4Q0Xtsg6Cfus=\n-----END PRIVATE KEY-----\n",
};
