# Data Issue Reporting

FootyStats lets users report data problems without needing a GitHub account. The in-app report form sends directly through Web3Forms, so the app can collect reports without adding a backend endpoint.

## Web3Forms Setup

Web3Forms requires a public access key. Add the project key in:

```ts
src/environments/environment.ts
```

```ts
export const environment = {
  web3FormsAccessKey: 'YOUR_WEB3FORMS_ACCESS_KEY',
};
```

The browser submits reports to `https://api.web3forms.com/submit`. Web3Forms treats the access key as a public form identifier, not a secret.

## User-Friendly Template

The dialog asks for one main answer and a few optional helpers:

- What should we fix?
- Correct value or source
- Club, season, and league context
- Email for follow-up

The generated Web3Forms message still includes the richer context for maintainers:

```text
Data issue report

What should we fix?
<Short description of the incorrect, missing, duplicated, or confusing data>

Correct value or source
<Correct value, source link, book/newspaper reference, screenshot note, or anything helpful>

Issue type: <Data looks wrong | Missing season or club | Duplicate or confusing club identity | Source or coverage question>
Page or feature: <Where the user reported from>
Link or screen: <App route or context>
Club or team: <Club/team if known>
Season or year: <Season if known>
League or competition: <League/tier if known>

Reporter email: <Optional>
```

## Current Entry Points

- Site footer: generic data report.
- League table archive: prefilled with the selected season and competition.
- Club profile: prefilled with the current club and latest visible season context.
