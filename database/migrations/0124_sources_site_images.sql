-- Whether the site shows the cover image of a source's articles (with credit). Off by default: only sources
-- whose licence expressly allows it (official agencies that ask for credit) are turned on.
ALTER TABLE sources ADD COLUMN IF NOT EXISTS site_images boolean NOT NULL DEFAULT false;
