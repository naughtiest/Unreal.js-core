﻿function box_extension(where) {
    return function (opts) {
        var menux = new JavascriptUIExtender
        var builders = {}
        var exts = []
        for (var k in opts) {
            var v = opts[k]
            var position = v.position || 'After'
            exts.push({ExtensionHook : k, HookPosition : position})

            var fn = v.builder
            builders[k] = fn
        }

        menux[where] = exts
        menux.OnHook.Add( function (hook) {
            var fn = builders[hook]
            if (fn) {
                fn(menux)
            }
        })
        return menux
    }
}

function MakeTab(opts,tab_fn,del_fn) {
    opts = opts || {}

    var tab = new JavascriptEditorTab
    tab.TabId = opts.TabId || 'TestJSTab'
    tab.Role = opts.Role || 'NomadTab'
    tab.DisplayName = opts.DisplayName || '안녕하세요!'
    tab.OnSpawnTab.Add(tab_fn)
    if (del_fn) {
        tab.OnCloseTab.Add(del_fn)    
    }
    return tab
}

module.exports = {
    menu : box_extension('MenuExtensions'),
    toolbar : box_extension('ToolbarExtensions'),
    tab : MakeTab,
    tabSpawner : function (opts,main) {
        let $tabs = global.$tabs = global.$tabs || {}
        let $inner = global.$tabinner = global.$tabinner || []        
        let $fns = global.$tabfns = global.$tabfns || {}
        const id = opts.TabId
        
        $fns[id] = main
        let opened = $tabs[id]
        if (opened) {
            opened.forEach(open => {
                let old = VerticalBox.C(open).GetChildAt(0)
                old.destroy && old.destroy()
                $inner.splice($inner.indexOf(old),1)
                VerticalBox.C(open).RemoveChildAt(0)
                let child = main()
                $inner.push(child)                
                open.AddChild(child)
            })
            return _ => {}
        }        
        
        opened = $tabs[id] = []
        
        let tab = MakeTab(opts, (context) => {
            let widget = new VerticalBox()
            let fn = $fns[id]
            let child = fn()
            $inner.push(child)
            widget.AddChild(child)
            opened.push(widget)
            return widget
        },widget => {
            $inner.splice($inner.indexOf(widget.GetChildAt(0)),1)
            opened.splice(opened.indexOf(widget),1)     
        })
        tab.Commit()
    },
    commands : function make_commands(opts) {
        var commands = new JavascriptUICommands

        opts = opts || {}
        commands.ContextName = opts.name || opts.Name || ''
        commands.ContextDesc = opts.description || opts.Description || 'context description'
        commands.ContextNameParent = opts.parent || opts.Parent || ''
        commands.StyleSetName = opts.styleset || opts.Styleset || 'None'

        var org_cmds = opts.commands || {}

        var cmds = []
        for (var k in org_cmds) {
            var v = org_cmds[k]
            cmds.push({
                Id : k,
                FriendlyName : v.name || v.Name,
                Description : v.description || v.Description,
                ActionType : v.type || v.Type || 'Button'
            })
        }
        commands.Commands = cmds
        commands.OnExecuteAction.Add( function (action) {
            var fn = org_cmds[action]
            fn && fn.execute && fn.execute()
            fn && fn.Execute && fn.Execute()
        })

        "OnCanExecuteAction/enabled OnIsActionChecked/checked OnIsActionButtonVisible/visible".split(' ')
        .forEach( function (v) {
            var xy = v.split('/')
            var x = xy[0]
            var y = xy[1]
            commands[x].Add( function (action) {
                var fn = org_cmds[action]
                if (fn && fn.query) {
                    return fn.query(y)
                }
                if (fn && fn.Query) {
                    return fn.Query(y)
                }
                return true
            })
        })
        return commands
    },
    editor : function make_editor(opts) {
        var editor = new JavascriptAssetEditorToolkit
        editor.ToolkitFName = 'jseditor'
        editor.BaseToolkitFName = 'jseditor_base'
        editor.ToolkitName = 'jseditor toolkit'
        editor.WorldCentricTabPrefix = 'jseditor'

        editor.Layout = JSON.stringify(opts.layout)

        if (opts.tabs != undefined) {
            editor.Tabs = opts.tabs
        }
        if (opts.commands != undefined) {
            editor.Commands = opts.commands
        }
        if (opts.menu != undefined) {
            editor.MenuExtender = opts.menu
        }
        if (opts.toolbar != undefined) {
            editor.ToolbarExtender = opts.toolbar
        }
        return editor
    }
}
