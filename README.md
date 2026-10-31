# Jiffy

[![build](https://github.com/Gaucho-Racing/jiffy/actions/workflows/build.yml/badge.svg)](https://github.com/Gaucho-Racing/jiffy/actions/workflows/build.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/c761998a-1e64-4f7c-9d31-7e69d63b30c0/deploy-status)](https://app.netlify.com/sites/gr-jiffy/deploys)
[![Docker Pulls](https://img.shields.io/docker/pulls/gauchoracing/jiffy?style=flat-square)](https://hub.docker.com/r/gauchoracing/jiffy)
[![Release](https://img.shields.io/github/release/gaucho-racing/jiffy.svg?style=flat-square)](https://github.com/gaucho-racing/jiffy/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Jiffy is Gaucho Racing's purchase request and order tracking platform.

Check out our wiki page [here](https://wiki.gauchoracing.com/books/jiffy) to learn more.

## Getting Started

Run the local development stack with Docker Compose:

```bash
# Fill Sentinel (and optional Discord/S3/Drive) secrets in example.env first.
# Pull SENTINEL_CLIENT_SECRET and SENTINEL_TOKEN from Vault app secrets `jiffy-prod`.
docker compose up --build
```

The development proxy serves Jiffy at:

```text
http://localhost:10310
```

The API is available under:

```text
http://localhost:10310/api
```

The compose stack starts:

- `jiffy`: Go API server (Air hot-reload)
- `web`: React/Vite frontend
- `db`: PostgreSQL
- `kerbecs`: local reverse proxy

Optional integrations (Discord, S3, Google Sheets) can be left blank in `example.env` for basic API/UI development. Auth against Sentinel requires the client secret and service-account token.

## Google Sheets

The dump writes the current academic year (September 1 through August 31, Pacific Time) into one spreadsheet. It does not need a code change to point at a new workbook.

1. In Google Cloud, create a service account and enable the Google Sheets API.
2. Create a key as JSON. Put the file contents (as-is or base64-encoded) in `DRIVE_SERVICE_ACCOUNT` (production Vault secret `jiffy-prod.drive_service_account`). The previous service account no longer exists, so this has to be a new one.
3. Create a spreadsheet. Add a tab named `Pending and Rejected`, plus one tab per department name (`Aerodynamics`, `Business`, `Chassis`, `Data`, `Drivetrain`, `Firmware`, `High Voltage`, `Low Voltage`, `Suspension`, `Systems`). The job writes item rows from `B6` through column `W` and clears those cells first.
4. Share the spreadsheet with the service account email as an Editor.
5. Set `PURCHASE_REQUESTS_SHEET_ID` to the id in the sheet URL (`/spreadsheets/d/<id>/`). Leave it empty to keep writing the old GR26 workbook. The header button reads this from the API.
6. The cron runs only when `ENV=PROD` and `SHEETS_CRON` is set (production uses `30 * * * *`). `POST /sheets` runs one dump immediately.

Copy the spreadsheet before the next September 1 if last season's tabs should stay in Sheets. The job clears the workbook and writes only the current academic year. Jiffy still keeps the older purchase requests.

## Contributing

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b gh-username/my-amazing-feature`)
3. Commit your Changes (`git commit -m 'Add my amazing feature'`)
4. Push to the Branch (`git push origin gh-username/my-amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.


*Shoutout Jeff "jiffy" Duong (Business Lead, 2024) whose financial wizardry and acute business accumen inspired this project.*