import { Config } from '@remotion/cli/config'

// The films use the site's own screenshots and photos, straight from its public folder.
Config.setPublicDir('../../apps/landing/public')
Config.setVideoImageFormat('png')
Config.setConcurrency(4)
