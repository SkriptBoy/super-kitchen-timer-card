# Super Kitchen Timer Card 🍳

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

A beautiful, user-friendly timer card for Home Assistant - perfect for the kitchen!

*Verfügbar in: 🇩🇪 Deutsch | 🇬🇧 English | 🇪🇸 Español*

## Features

- ⏱️ **Large Timer Display** - Easy to read from a distance
- 🍳 **Food Presets** - Dropdown with Eggs, Pasta, Rice, Potatoes and more
- 🔘 **Quick Buttons** - One-click start (5, 10, 15, 20 min)
- ⌨️ **Custom Input** - Enter any time manually
- 🔔 **Sound Alert** - Built-in gong or custom MP3/WAV
- 🚨 **Visual Alert** - Pulsing animation when time is running out
- ⏸️ **Pause/Resume** - Pause and continue timer
- 🎨 **Customizable** - Colors, presets, sounds via Visual Editor
- 🌍 **Multi-Language** - German, English, Spanish

## Installation

### HACS (recommended)

1. Open HACS
2. Frontend → Three dots → Custom repositories
3. Enter URL: `https://github.com/yourusername/super-kitchen-timer-card`
4. Category: Lovelace
5. Add → Install

### Manual

1. Copy `super-kitchen-timer-card.js` to `/config/www/`
2. Add resource: `/local/super-kitchen-timer-card.js`

## Prerequisites

You need a **Timer helper** in Home Assistant:

```yaml
# configuration.yaml
timer:
  kitchen_timer:
    name: Kitchen Timer
    duration: "00:05:00"
```

Or create via UI: Settings → Devices & Services → Helpers → Add → Timer

## Configuration

### Visual Editor (recommended)

The card has a complete Visual Editor - just add the card and configure!

### YAML Example

```yaml
type: custom:super-kitchen-timer-card
timer_entity: timer.kitchen_timer
name: Kitchen Timer
language: en
icon: mdi:timer-outline
presets:
  - 5
  - 10
  - 15
  - 20
show_food_presets: true
alert_threshold: 60
alert_sound: true
sound_volume: 0.7
sound_repeat: 3
primary_color: "#4CAF50"
alert_color: "#FF5722"
```

## Custom Sound

You can use your own sound file instead of the built-in gong:

### Step 1: Upload Sound File

Copy your MP3 or WAV file to your Home Assistant:

**Option A: Via Samba/SMB Share**
```
\\your-ha-ip\config\www\sounds\my-gong.mp3
```

**Option B: Via File Editor Add-on**
1. Install "File Editor" add-on
2. Navigate to `/config/www/sounds/`
3. Upload your file

**Option C: Via SSH/SFTP**
```bash
scp my-gong.mp3 root@your-ha-ip:/config/www/sounds/
```

### Step 2: Configure in Card

In the Visual Editor under "Sound & Alert":
- Enter path: `/local/sounds/my-gong.mp3`

Or in YAML:
```yaml
custom_sound: /local/sounds/my-gong.mp3
```

> **Note:** The path uses `/local/` which maps to `/config/www/`

### Recommended Sound Settings
- Format: MP3 or WAV
- Duration: 1-3 seconds
- Size: < 500 KB

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timer_entity` | string | **required** | Timer entity ID |
| `name` | string | "Kitchen Timer" | Display name |
| `language` | string | "de" | Language: de, en, es |
| `icon` | string | "mdi:timer-outline" | Icon |
| `presets` | list | [5, 10, 15, 20] | Quick buttons (minutes) |
| `show_food_presets` | boolean | true | Show food dropdown |
| `food_presets` | list | (built-in) | Custom food presets |
| `alert_threshold` | number | 60 | Alert starts at X seconds |
| `alert_sound` | boolean | true | Play sound at end |
| `custom_sound` | string | null | Path to custom sound |
| `sound_volume` | number | 0.7 | Volume (0.1 - 1.0) |
| `sound_repeat` | number | 3 | Repeat sound X times |
| `primary_color` | color | "#4CAF50" | Main color |
| `alert_color` | color | "#FF5722" | Alert color |

## Custom Food Presets

Add your own dishes via the Visual Editor or YAML:

```yaml
food_presets:
  - name: "Soft Egg"
    icon: "🥚"
    seconds: 240
  - name: "Medium Egg"
    icon: "🥚"
    seconds: 360
  - name: "Steak Medium"
    icon: "🥩"
    seconds: 180
  - name: "My Recipe"
    icon: "👨‍🍳"
    seconds: 900
```

## Default Food Presets

| Dish | Time | 🇩🇪 | 🇬🇧 | 🇪🇸 |
|------|------|-----|-----|-----|
| 🥚 | 4:00 | Ei weich | Egg soft | Huevo pasado |
| 🥚 | 6:00 | Ei wachsweich | Egg medium | Huevo mollet |
| 🥚 | 9:00 | Ei hart | Egg hard | Huevo duro |
| 🍝 | 8:00 | Nudeln al dente | Pasta al dente | Pasta al dente |
| 🍝 | 10:00 | Nudeln weich | Pasta soft | Pasta blanda |
| 🍚 | 12:00 | Reis | Rice | Arroz |
| 🥔 | 20:00 | Kartoffeln | Potatoes | Patatas |
| 🔥 | 3:00 | Röstaromen | Roast aromas | Tostado |

## Troubleshooting

### Sound not playing?
- Check browser allows audio autoplay
- Try clicking the card first (browser security)
- Check sound volume setting
- Verify custom sound path is correct

### Timer not counting down?
- Verify timer entity exists in Home Assistant
- Check browser console for errors
- Clear browser cache and reload

## License

MIT License - Free to use and modify!

## Credits

Created with ❤️ by Wolfgang & Claude
