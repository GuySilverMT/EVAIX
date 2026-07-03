# UI COMPILER INSTRUCTIONS
> Generated: 2026-07-02T08:27:12.125Z

You are an expert Frontend AI. Your task is to compile the following JSON UI tree and design tokens into production-ready React (TSX) code.

## 1. GLOBAL ARCHITECTURE NOTES
this is the model bar component it replaces the super ai button allowing the user to immediately see what model from what provider will run on the next run agent click it needs to be premtive that way and it goes everywhere its location determines the context it is feed when clicked. so if its used in the main nav bar it is feed context from every card in every row and column that is being used. in the drop down (right click) of its play button is context selector or context stack 
 the options are 
visible card- so the open card visible card of the application stack including all tabs of that application ( the navbar model bar would run every visible card in every row and every column that is open (including those that arent really visible they are condensed but still have a open application)
visible tab-only the visible singel tab of the open application. 
full stack every used card in the application stack is fed as context. each setting of the play buttlon context selector should have its own unique icon.
the contest estimator imediately recalculates when this changes 
 I also want it to condense down into a single super Ai button for when space is limited like when a prompt has 4 parellel tasks running (which looks like for culumns under one column and see the evaix workbench json) or for when we port evaix to android
there is a super ai button that sort of sort of does this but it becomes a drop down of each button with a matrix of sorts drop down expand left or right or drop up depending where its located we cant have it exspanding out of bounds.

so the parent model bar sets its children until its children are manually edited then the child is independent if that makes sense ? 

## 2. DESIGN TOKENS (MUI Theme)
Below is the MUI theme configuration for this environment. You must generate a `theme.ts` file exporting this exact configuration using `createTheme()`.
```json
{
  "palette": {
    "mode": "dark",
    "primary": {
      "main": "#892481"
    },
    "background": {
      "default": "#892481",
      "paper": "#18181a"
    },
    "text": {
      "primary": "#892481",
      "secondary": "#892481"
    },
    "divider": "#892481",
    "error": {
      "main": "#892481"
    },
    "success": {
      "main": "#892481"
    },
    "warning": {
      "main": "#892481"
    }
  },
  "typography": {
    "fontFamily": "'Syne', sans-serif",
    "fontSize": 36
  }
}
```

## 3. UI COMPONENT TREE (JSON)
Below is the exact hierarchical structure of the layout. Nodes marked with `"isComponent": true` should be extracted into their own modular React components if possible.

```json
[
  {
    "id": "b7",
    "name": "Container-2",
    "role": "container",
    "position": {
      "x": 50,
      "y": 50,
      "flow": "relative"
    },
    "size": {
      "w": 398,
      "h": 36
    },
    "fillParent": false,
    "isComponent": false,
    "style": {
      "backgroundColor": "var(--model-bak)",
      "backgroundColorValue": "#464649",
      "textColor": "var(--primary)",
      "textColorValue": "#892481",
      "borderColor": "var(--model-high)",
      "borderColorValue": "#16c522",
      "borderWidth": 1,
      "borderStyle": "solid",
      "font": "var(--main)",
      "fontValue": "'Syne', sans-serif",
      "fontSize": "var(--body)",
      "fontSizeValue": 36,
      "opacity": 100,
      "textAlign": "left",
      "verticalAlign": "top"
    },
    "tableStyles": null,
    "objectContent": null,
    "aiNotes": "this is the new model bar it replaces the super ai button its location determines its context and the along with the ",
    "grid": null,
    "children": [
      {
        "id": "b9",
        "name": "Table-2",
        "role": "table",
        "position": {
          "x": 0,
          "y": 0,
          "flow": "relative"
        },
        "size": {
          "w": 100,
          "h": 40
        },
        "fillParent": true,
        "isComponent": false,
        "style": {
          "backgroundColor": null,
          "backgroundColorValue": "transparent",
          "textColor": "var(--primary)",
          "textColorValue": "#892481",
          "borderColor": "var(--border)",
          "borderColorValue": "#892481",
          "borderWidth": 0,
          "borderStyle": "solid",
          "font": "var(--main)",
          "fontValue": "'Syne', sans-serif",
          "fontSize": "var(--body)",
          "fontSizeValue": 36,
          "opacity": 100,
          "textAlign": "left",
          "verticalAlign": "top"
        },
        "tableStyles": {
          "innerGridWidth": 1,
          "innerGridColor": "var(--border)",
          "innerGridColorValue": "#892481",
          "innerGridStyle": "solid",
          "gridPattern": "all"
        },
        "objectContent": null,
        "aiNotes": "",
        "grid": {
          "columns": [
            {
              "index": 0,
              "widthPx": 12,
              "pct": 11.6
            },
            {
              "index": 1,
              "widthPx": 11,
              "pct": 11.4
            },
            {
              "index": 2,
              "widthPx": 11,
              "pct": 11.3
            },
            {
              "index": 3,
              "widthPx": 11,
              "pct": 11.2
            },
            {
              "index": 4,
              "widthPx": 43,
              "pct": 43.4
            },
            {
              "index": 5,
              "widthPx": 11,
              "pct": 11.1
            }
          ],
          "rows": [
            {
              "index": 0,
              "heightPx": 100,
              "pct": 250
            }
          ]
        },
        "children": [
          {
            "id": "b10",
            "name": "Cell-0-0",
            "role": "cell",
            "position": {
              "x": null,
              "y": null,
              "flow": "relative"
            },
            "size": {
              "w": null,
              "h": null
            },
            "fillParent": false,
            "isComponent": false,
            "style": {
              "backgroundColor": null,
              "backgroundColorValue": "transparent",
              "textColorValue": "transparent",
              "borderColorValue": "transparent",
              "borderWidth": 0,
              "borderStyle": "solid",
              "fontValue": "'Roboto', sans-serif",
              "fontSizeValue": 12,
              "opacity": 100,
              "textAlign": "left",
              "verticalAlign": "top"
            },
            "tableStyles": null,
            "objectContent": null,
            "aiNotes": "",
            "grid": null,
            "children": [
              {
                "id": "b19",
                "name": "Object-1",
                "role": "object",
                "position": {
                  "x": 0,
                  "y": 0,
                  "flow": "relative"
                },
                "size": {
                  "w": 100,
                  "h": 40
                },
                "fillParent": true,
                "isComponent": false,
                "style": {
                  "backgroundColor": null,
                  "backgroundColorValue": "transparent",
                  "textColor": "var(--model-high)",
                  "textColorValue": "#16c522",
                  "borderColor": "var(--border)",
                  "borderColorValue": "#892481",
                  "borderWidth": 0,
                  "borderStyle": "solid",
                  "font": "var(--main)",
                  "fontValue": "'Syne', sans-serif",
                  "fontSize": "var(--body)",
                  "fontSizeValue": 36,
                  "opacity": 100,
                  "textAlign": "center",
                  "verticalAlign": "center"
                },
                "tableStyles": null,
                "objectContent": {
                  "type": "text",
                  "text": "S",
                  "icon": "circle",
                  "tooltip": "",
                  "action": ""
                },
                "aiNotes": "this is our model selection bandits and logic we might have \nRound Robin\nFree - only free use\nArbitration - some provider like grok i get free credits that i need to use all every month sort of thing but not technicaly free\noff- i manually select myself \nsmart - model is selected by availability and fit by the role \nedit/new opens a modal were I can prompt the ai to edit or create new model selection logic any new system appears with its own icon\n",
                "grid": null,
                "children": []
              }
            ]
          },
          {
            "id": "b11",
            "name": "Cell-0-1",
            "role": "cell",
            "position": {
              "x": null,
              "y": null,
              "flow": "relative"
            },
            "size": {
              "w": null,
              "h": null
            },
            "fillParent": false,
            "isComponent": false,
            "style": {
              "backgroundColor": null,
              "backgroundColorValue": "transparent",
              "textColorValue": "transparent",
              "borderColorValue": "transparent",
              "borderWidth": 0,
              "borderStyle": "solid",
              "fontValue": "'Roboto', sans-serif",
              "fontSizeValue": 12,
              "opacity": 100,
              "textAlign": "left",
              "verticalAlign": "top"
            },
            "tableStyles": null,
            "objectContent": null,
            "aiNotes": "",
            "grid": null,
            "children": [
              {
                "id": "b20",
                "name": "Object-2",
                "role": "object",
                "position": {
                  "x": 0,
                  "y": 0,
                  "flow": "relative"
                },
                "size": {
                  "w": 100,
                  "h": 40
                },
                "fillParent": true,
                "isComponent": false,
                "style": {
                  "backgroundColor": null,
                  "backgroundColorValue": "transparent",
                  "textColor": "var(--model-high)",
                  "textColorValue": "#16c522",
                  "borderColor": "var(--border)",
                  "borderColorValue": "#892481",
                  "borderWidth": 0,
                  "borderStyle": "solid",
                  "font": "var(--main)",
                  "fontValue": "'Syne', sans-serif",
                  "fontSize": "var(--body)",
                  "fontSizeValue": 36,
                  "opacity": 100,
                  "textAlign": "center",
                  "verticalAlign": "center"
                },
                "tableStyles": null,
                "objectContent": {
                  "type": "text",
                  "text": "P",
                  "icon": "circle",
                  "tooltip": "",
                  "action": ""
                },
                "aiNotes": "Provider selector \nevery Provider in the system has has aits own unique button with its initials GK for grok OR for openrouter etc when this button is hit the drop down stays open right clicking on a provider icon toggles it off and on a red color indicates off and green on this way i can remove a provider from model selection with 2 clicks \nso each provider is button in drop down the tooltip has full name and there is a add button when click brings up the provider manager if i left click on a provider it selects that provider as the next provider run and fills the model selector button with that provders models if i go back and hit the selector button with left click it plots the model and provider selection again with whatever logic is used shows clearly what selection process, provider, and model will be used on the next run in a minamalist manner that is easily understood by the icons rendered",
                "grid": null,
                "children": []
              }
            ]
          },
          {
            "id": "b14",
            "name": "Cell-0-2",
            "role": "cell",
            "position": {
              "x": null,
              "y": null,
              "flow": "relative"
            },
            "size": {
              "w": null,
              "h": null
            },
            "fillParent": false,
            "isComponent": false,
            "style": {
              "backgroundColor": null,
              "backgroundColorValue": "transparent",
              "textColorValue": "transparent",
              "borderColorValue": "transparent",
              "borderWidth": 0,
              "borderStyle": "solid",
              "fontValue": "'Roboto', sans-serif",
              "fontSizeValue": 12,
              "opacity": 100,
              "textAlign": "left",
              "verticalAlign": "top"
            },
            "tableStyles": null,
            "objectContent": null,
            "aiNotes": "",
            "grid": null,
            "children": [
              {
                "id": "b21",
                "name": "Object-3",
                "role": "object",
                "position": {
                  "x": 0,
                  "y": 0,
                  "flow": "relative"
                },
                "size": {
                  "w": 100,
                  "h": 40
                },
                "fillParent": true,
                "isComponent": false,
                "style": {
                  "backgroundColor": null,
                  "backgroundColorValue": "transparent",
                  "textColor": "var(--model-high)",
                  "textColorValue": "#16c522",
                  "borderColor": "var(--border)",
                  "borderColorValue": "#892481",
                  "borderWidth": 0,
                  "borderStyle": "solid",
                  "font": "var(--main)",
                  "fontValue": "'Syne', sans-serif",
                  "fontSize": "var(--body)",
                  "fontSizeValue": 36,
                  "opacity": 100,
                  "textAlign": "center",
                  "verticalAlign": "center"
                },
                "tableStyles": null,
                "objectContent": {
                  "type": "text",
                  "text": "M",
                  "icon": "circle",
                  "tooltip": "",
                  "action": ""
                },
                "aiNotes": "model selector operates much like provider each model has its own icon we see only the models from the selected providers right clicking toggles the model on and off. ",
                "grid": null,
                "children": []
              }
            ]
          },
          {
            "id": "b15",
            "name": "Cell-0-3",
            "role": "cell",
            "position": {
              "x": null,
              "y": null,
              "flow": "relative"
            },
            "size": {
              "w": null,
              "h": null
            },
            "fillParent": false,
            "isComponent": false,
            "style": {
              "backgroundColor": null,
              "backgroundColorValue": "transparent",
              "textColorValue": "transparent",
              "borderColorValue": "transparent",
              "borderWidth": 0,
              "borderStyle": "solid",
              "fontValue": "'Roboto', sans-serif",
              "fontSizeValue": 12,
              "opacity": 100,
              "textAlign": "left",
              "verticalAlign": "top"
            },
            "tableStyles": null,
            "objectContent": null,
            "aiNotes": "",
            "grid": null,
            "children": [
              {
                "id": "b22",
                "name": "Object-4",
                "role": "object",
                "position": {
                  "x": 0,
                  "y": 0,
                  "flow": "relative"
                },
                "size": {
                  "w": 100,
                  "h": 40
                },
                "fillParent": true,
                "isComponent": false,
                "style": {
                  "backgroundColor": null,
                  "backgroundColorValue": "transparent",
                  "textColor": "var(--model-high)",
                  "textColorValue": "#16c522",
                  "borderColor": "var(--border)",
                  "borderColorValue": "#892481",
                  "borderWidth": 0,
                  "borderStyle": "solid",
                  "font": "var(--main)",
                  "fontValue": "'Syne', sans-serif",
                  "fontSize": "var(--body)",
                  "fontSizeValue": 36,
                  "opacity": 100,
                  "textAlign": "center",
                  "verticalAlign": "center"
                },
                "tableStyles": null,
                "objectContent": {
                  "type": "text",
                  "text": "R",
                  "icon": "circle",
                  "tooltip": "",
                  "action": ""
                },
                "aiNotes": "brings up the compact role selector drop down",
                "grid": null,
                "children": []
              }
            ]
          },
          {
            "id": "b16",
            "name": "Cell-0-4",
            "role": "cell",
            "position": {
              "x": null,
              "y": null,
              "flow": "relative"
            },
            "size": {
              "w": null,
              "h": null
            },
            "fillParent": false,
            "isComponent": false,
            "style": {
              "backgroundColor": null,
              "backgroundColorValue": "transparent",
              "textColorValue": "transparent",
              "borderColorValue": "transparent",
              "borderWidth": 0,
              "borderStyle": "solid",
              "fontValue": "'Roboto', sans-serif",
              "fontSizeValue": 12,
              "opacity": 100,
              "textAlign": "left",
              "verticalAlign": "top"
            },
            "tableStyles": null,
            "objectContent": null,
            "aiNotes": "",
            "grid": null,
            "children": [
              {
                "id": "b23",
                "name": "Object-5",
                "role": "object",
                "position": {
                  "x": 0,
                  "y": 0,
                  "flow": "relative"
                },
                "size": {
                  "w": 100,
                  "h": 40
                },
                "fillParent": true,
                "isComponent": false,
                "style": {
                  "backgroundColor": null,
                  "backgroundColorValue": "transparent",
                  "textColor": "var(--model-high)",
                  "textColorValue": "#16c522",
                  "borderColor": "var(--border)",
                  "borderColorValue": "#892481",
                  "borderWidth": 0,
                  "borderStyle": "solid",
                  "font": "var(--main)",
                  "fontValue": "'Syne', sans-serif",
                  "fontSize": "var(--body)",
                  "fontSizeValue": 36,
                  "opacity": 100,
                  "textAlign": "center",
                  "verticalAlign": "center"
                },
                "tableStyles": null,
                "objectContent": {
                  "type": "text",
                  "text": "33/256K",
                  "icon": "circle",
                  "tooltip": "",
                  "action": ""
                },
                "aiNotes": "this is the context estimator it estimates the context size of the run agent button based on the model bars location and the play context stack set in the play button drop down. mcp servers and tools /roles apply heavily to this estimate if the context gets to large for the model set to run it turns red and eventually doesnt allow the run agent button to work",
                "grid": null,
                "children": []
              }
            ]
          },
          {
            "id": "b17",
            "name": "Cell-0-5",
            "role": "cell",
            "position": {
              "x": null,
              "y": null,
              "flow": "relative"
            },
            "size": {
              "w": null,
              "h": null
            },
            "fillParent": false,
            "isComponent": false,
            "style": {
              "backgroundColor": "var(--model-high)",
              "backgroundColorValue": "#16c522",
              "textColorValue": "transparent",
              "borderColorValue": "transparent",
              "borderWidth": 0,
              "borderStyle": "solid",
              "fontValue": "'Roboto', sans-serif",
              "fontSizeValue": 12,
              "opacity": 100,
              "textAlign": "left",
              "verticalAlign": "top"
            },
            "tableStyles": null,
            "objectContent": null,
            "aiNotes": "",
            "grid": null,
            "children": [
              {
                "id": "b24",
                "name": "Object-6",
                "role": "object",
                "position": {
                  "x": 0,
                  "y": 0,
                  "flow": "relative"
                },
                "size": {
                  "w": 100,
                  "h": 40
                },
                "fillParent": true,
                "isComponent": false,
                "style": {
                  "backgroundColor": null,
                  "backgroundColorValue": "transparent",
                  "textColor": "var(--model-high)",
                  "textColorValue": "#16c522",
                  "borderColor": "var(--border)",
                  "borderColorValue": "#892481",
                  "borderWidth": 0,
                  "borderStyle": "solid",
                  "font": "var(--fnticon)",
                  "fontValue": "'Roboto', sans-serif",
                  "fontSize": "var(--icon)",
                  "fontSizeValue": 50,
                  "opacity": 100,
                  "textAlign": "center",
                  "verticalAlign": "center"
                },
                "tableStyles": null,
                "objectContent": {
                  "type": "icon",
                  "text": "Content",
                  "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24px\" viewBox=\"0 -960 960 960\" width=\"24px\" fill=\"#e3e3e3\"><path d=\"M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z\"/></svg>",
                  "tooltip": "",
                  "action": ""
                },
                "aiNotes": "i dont like padding i want the icon to fill the entire square but badbuilder isnt allowing me to change icon size\nthis is the run agent/context stack button left click runs the agent right click brings up context stack selection drop down \nwith visible \ntab\nand full stack ",
                "grid": null,
                "children": []
              }
            ]
          }
        ]
      }
    ]
  }
]
```

## 4. COMPILATION RULES
1. **Material UI Strict Mode**: Map all JSON roles to `@mui/material` components (`<Box>`, `<Grid>`, `<Typography>`, `<Button>`). DO NOT use raw HTML tags.
2. **ABSOLUTELY NO HARDCODED STYLES**: You are strictly forbidden from using hex codes, rgb values, or explicit pixel sizes for typography in the component files. All styling MUST reference the MUI theme object.
3. **The `sx` Prop Protocol**: Use the `sx` prop for styling. Map the JSON properties directly to theme keys. For example:
   - BAD: `sx={{ backgroundColor: '#18181a', color: '#e8e8ec' }}`
   - GOOD: `sx={{ bgcolor: 'background.paper', color: 'text.primary' }}`
   - If the JSON requests a border, use `sx={{ border: 1, borderColor: 'divider' }}`.
4. **Architecture**: Output the `theme.ts` file, followed by the modular React component files requested by the `isComponent` flags in the JSON tree.