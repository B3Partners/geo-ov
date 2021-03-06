/* global Ext, karTheme, contextPath, editor, Point */

/**
 * KAR Geo Tool - applicatie voor het registreren van KAR meldpunten
 *
 * Copyright (C) 2009-2013 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * Class for representing the currently selected trafficsystem
 *
 *
 */
Ext.define("nl.b3p.kar.Overview",{
    editor : null,
    domId : null,
    tree : null,
    heightOffset:null,
    uitmeldpuntMenu:null,
    selectedMovement:null,
    constructor : function (editor,domId){
        this.editor = editor;
        this.domId = domId;
        this.heightOffset = 75;
        this.editor.on("activeRseqUpdated", function(rseq) { this.updateOverview(rseq, true); },this);
        this.editor.on("vehicleTypeChanged", function() { this.updateOverview(editor.activeRseq, false); },this);
        this.editor.on("activeRseqChanged", function(rseq) { this.updateOverview(rseq, false); },this);
        this.editor.on('selectedObjectChanged',this.updateSelection,this);

        this.editor.olc.highlight.events.register('featurehighlighted',this,function (evt){
            if (this.isPoint(evt.feature)){
                this.highlight(evt.feature.data.id);
            }
        });
        this.editor.olc.highlight.events.register('featureunhighlighted',this,function (evt){
            if (this.isPoint(evt.feature)){
                this.unhighlight(evt.feature.data.id);
            }
        });

        var me = this;
        this.otherMenu = Ext.create("Ext.menu.Menu", {
            floating: true,
            renderTo: Ext.getBody(),
            items: [
                {
                    id: 'reorderPoints',
                    text: 'Herorden punten',
                    xtype: "menucheckitem"
                }
            ],
            listeners: {
                click: {
                    scope:this,
                    fn: function (menu, item, e, opts) {
                        switch (item.id) {
                            case 'reorderPoints':
                                var view = this.tree.getView();
                                var dd = view.getPlugin('treeviewdragdrop');
                                var enable = item.checked;

                                if (enable) {
                                    dd.dragZone.unlock();
                                    editor.overview.tree.getView().getSelectionModel().selectionMode = "SINGLE";
                                } else {
                                    dd.dragZone.lock();
                                    editor.overview.tree.getView().getSelectionModel().selectionMode = "MULTI";
                                }
                                break;
                        }
                    }
                }
            }
        });

        this.uitmeldpuntMenu = Ext.create ("Ext.menu.Menu",{
            floating: true,
            renderTo: Ext.getBody(),
            items: [
            {
                id: 'editUitmeldpuntOv',
                text: 'Bewerken...',
                icon: contextPath + "/images/silk/table_edit.png"
            },
            {
                id: 'removeUitmeldpuntOv',
                text: 'Verwijderen',
                icon: contextPath + "/images/silk/table_delete.png"
            },
            {
                id: 'setCoordsUitmeldOv',
                text: 'Voer coördinaten in',
                icon: contextPath + "/images/icons/gps.png"
            },{
                id: "uppercheckoutOv",
                xtype: 'menuseparator'
            },
            {
                id: 'addEindpuntOv',
                text: 'Voeg nieuw eindpunt toe',
                icon: karTheme.eindPunt,
                iconCls : 'overviewTree'
            },
            {
                id: 'selectEindpuntOv',
                text: 'Selecteer bestaand eindpunt',
                icon: contextPath + "/images/silk/cursor.png"
            },
            {
                id: 'addInmeldpuntOv',
                text: 'Voeg nieuw inmeldpunt toe',
                disabled:true,
                icon: karTheme.inmeldPunt,
                iconCls : 'overviewTree'
            },
            {
                id: 'selectInmeldpuntOv',
                text: 'Selecteer bestaand inmeldpunt',
                disabled:true,
                icon: contextPath + "/images/silk/cursor.png"
            },
            {
                id : "lowercheckoutOv",
                xtype: 'menuseparator'
            },
            {
                id: 'advancedCheckoutOv',
                text: 'Geavanceerd',
                menu: {
                    items:[
                        {
                            id: 'addExtraUitmeldpuntOv',
                            text: 'Voeg nieuw uitmeldpunt toe',
                            icon: karTheme.uitmeldPunt,
                            iconCls : 'overviewTree'
                        },
                        {
                            id: 'selectUitmeldpuntAndereSignaalgroepOv',
                            text: 'Selecteer uitmeldpunt van andere fasecyclus',
                            icon: contextPath + "/images/silk/cursor.png"
                        },
                        {
                            id: 'addBeginpuntOv',
                            text: 'Voeg beginpunt toe',
                            icon: karTheme.startPunt,
                            iconCls : 'overviewTree'
                        },
                        {
                            id: 'addBeginpuntOvCoordinates',
                            text: 'Voeg nieuw beginpunt toe op basis van coördinaten',
                            icon: karTheme.startPunt,
                            iconCls : 'overviewTree'
                        },
                        {
                            id: 'addEindpuntOvCoordinates',
                            text: 'Voeg nieuw eindpunt toe op basis van coördinaten',
                            icon: karTheme.eindPunt,
                            iconCls : 'overviewTree'
                        },
                        {
                            id: 'addInmeldpuntOvCoordinates',
                            text: 'Voeg nieuw inmeldpunt toe op basis van coördinaten',
                            disabled:true,
                            icon: karTheme.inmeldPunt,
                            iconCls : 'overviewTree'
                        },
                        {
                            id: 'copyMovement',
                            text: 'Kopieer beweging (uit- en eindpunt)',
                            icon: karTheme.copy_movment,
                            iconCls : 'overviewTree'
                        }
                    ],
                    listeners: {
                        click:
                        function(menu,item,e, opts) {
                            switch (item.id) {
                                case 'addBeginpuntOv':
                                    this.editor.addBeginpunt();
                                    break;
                                case 'addExtraUitmeldpuntOv':
                                    this.editor.addUitmeldpunt(this.selectedMovement);
                                    break;
                                case 'selectUitmeldpuntAndereSignaalgroepOv':
                                    this.editor.selectExistingUitmeldpunt(this.selectedMovement);
                                    break;
                                case 'addBeginpuntOvCoordinates':
                                    editor.addByCoordinates('beginpunt');
                                    break;
                                case 'addEindpuntOvCoordinates':
                                    editor.addByCoordinates('eindpunt');
                                    break;
                                case 'addInmeldpuntOvCoordinates':
                                    editor.addByCoordinates('inmeldpunt');
                                    break;
                                case 'copyMovement':
                                    editor.copyMovement(this.selectedMovement);
                                    break;
                            }
                        },
                        scope:me
                    }
                }
            }
            ],
            listeners: {
                click: function(menu,item,e, opts) {
                    this.editor.activeMovement = this.selectedMovement;
                    switch (item.id) {
                        case 'editUitmeldpuntOv':
                            this.editor.editSelectedObject();
                            break;
                        case 'removeUitmeldpuntOv':
                            this.editor.removeSingleCheckoutPoint();
                            break;
                        case 'addEindpuntOv':
                            editor.addEindpunt();
                            break;
                        case 'selectEindpuntOv':
                            editor.selectEindpunt();
                            break;
                        case 'addInmeldpuntOv':
                            editor.addInmeldpunt();
                            break;
                        case 'selectInmeldpuntOv':
                            editor.selectInmeldpunt();
                            break;
                        case 'setCoordsUitmeldOv':
                            this.editor.editForms.editCoordinates(this.editor.selectedObject);
                            break;
                    }
                },
                scope:me
            }
        });
        this.updateLayerLabel();

    },
    updateOverview : function (rseq, changed){
        this.updateLayerLabel();
        var scrollY = 0;
        if (this.tree){
            if(this.tree.view){
                scrollY = this.tree.getScrollY();
            }
            this.tree.destroy();
        }
        if(!rseq) {
            Ext.get("context_vri").setHtml("");
            Ext.get("validationResults").setHtml("");
            return;
        }
        Ext.get("context_vri").setHtml(rseq === null ? "" : (rseq.getDescription()) + " (" + rseq.getKarAddress() + ")");
        if(rseq && rseq.getEditable()){
            Ext.get("rseqOptions").setVisible(true);
        } else {
            Ext.get("rseqOptions").setVisible(false);
        }
        var memoIcon = Ext.get("memo_vri");
        if (rseq && rseq.getMemo() && rseq.getMemo() !== ""){
            memoIcon.setVisible(true);
        } else{
            memoIcon.setVisible(false);
        }

        if(changed || rseq === null || rseq.getValidationErrors() === null) {
            Ext.get("validationResults").setHtml("");
        } else {
            if(rseq.getValidationErrors() === 0) {
                Ext.get("validationResults").setHtml("KV9 validatie: <span style=\"color: green; font-weight: bold\">OK</span>");
            } else {
                Ext.get("validationResults").setHtml("KV9 validatie: <a href=\"#\" onclick=\"editor.showValidationResults()\" style=\"color: red; font-weight: bold\">Toon " + rseq.getValidationErrors() + " fout" + (rseq.getValidationErrors() === 1 ? "" : "en") + "</a>");
            }
        }

        var overzicht = Ext.ComponentQuery.query("#overzichtContainer")[0];
        if(rseq){
            var root = this.createRootNode(rseq.getOverviewJSON());
            var store = Ext.create('Ext.data.TreeStore',root);
            this.tree = Ext.create('Ext.tree.Panel',{
                border : false,
                header : false,
                //id : "tree",
                selModel : {
                    mode : "MULTI"
                },
                store : store,
                rootVisible : false,
                viewConfig: {
                    plugins:
                        [
                            {
                                ptype: 'treeviewdragdrop',
                                pluginId: "treeviewdragdrop"
                            }
                        ]
                    ,
                    listeners: {
                        drop:{
                            fn:this.nodeDragged,
                            scope:this
                        },
                        beforedrop :{
                            fn: function(node,data,target){
                                var source = data.records[0];
                                var originalMovement = source.parentNode.raw.movementId;
                                var newMovement = target.parentNode.raw.movementId;
                                if(originalMovement !== newMovement){
                                    Ext.Msg.alert('Fout bij verplaatsen', "Kan geen punten verplaatsen naar een andere beweging.");
                                    return false;
                                }
                            },
                            scope:this
                        }
                    }
                },
                listeners : {
                    scope : this,
                    select : function (tree,record){
                        if (record.raw.type === "point"){
                            var id = record.raw.pointId;
                            var vectorLayer = this.editor.olc.vectorLayer;
                            var features = vectorLayer.getFeaturesByAttribute("id",id);
                            if (features !== null && features.length > 0){
                                var feature = null;
                                if( features.length === 1){
                                    feature = features[0];
                                }else{
                                    // get the first feature of class point (it's possibly an rseq with the same id)
                                    for (var i = 0 ; i < features.length ;i++){
                                        if(features[i].data.className === "Point"){
                                            feature = features[i];
                                            break;
                                        }
                                    }
                                }
                                if(feature){
                                    this.editor.setSelectedObject(feature);
                                }
                            }
                        }
                    },
                    itemmouseenter: function (tree, record) {
                        var vectorLayer = this.editor.olc.vectorLayer;
                        var features = [];
                        if (record.raw.type === "point") {
                            var id = record.raw.pointId;
                            var features = vectorLayer.getFeaturesByAttribute("id", id);

                        } else if (record.raw.type === "movement") {
                            var nummer = record.raw.movementNumber;
                            var fs = vectorLayer.features;
                            for (var i = 0 ; i < fs.length; i++){
                                var feat = fs[i];
                                if(feat.attributes.movementNumbers && feat.attributes.movementNumbers.indexOf(nummer) !== -1){
                                    features.push(feat);
                                }
                            }
                            
                        }
                        if (features !== null ) {
                            for (var i = 0; i < features.length; i++) {
                                var feat = features[i];
                                if (feat.renderIntent !== "select") {
                                    feat.renderIntent = "temporary";
                                }
                            }
                            vectorLayer.redraw();
                        
                        }
                    },
                    itemmouseleave: function (tree, record) {
                        var features = [];
                        var vectorLayer = this.editor.olc.vectorLayer;
                        if (record.raw.type === "point") {
                            var id = record.raw.pointId;
                            var currentSelectedObject = this.editor.selectedObject;
                            if (currentSelectedObject === null || currentSelectedObject.getId() !== id) {
                                features = vectorLayer.getFeaturesByAttribute("id", id);
                            }
                        } else if (record.raw.type === "movement") {
                            var nummer = record.raw.movementNumber;
                            var fs = vectorLayer.features;
                            for (var i = 0; i < fs.length; i++) {
                                var feat = fs[i];
                                if (feat.attributes.movementNumbers && feat.attributes.movementNumbers.indexOf(nummer) !== -1) {
                                    features.push(feat);
                                }
                            }
                        }

                        if (features !== null) {
                            for (var i = 0; i < features.length; i++) {
                                var feat = features[i];
                                if (feat.renderIntent !== "select") {
                                    feat.renderIntent = "default";
                                }
                            }
                            vectorLayer.redraw();
                        }
                    },
                    itemcontextmenu : function (view,record,item,index,event,eOpts){
                        var type = record.raw.type;
                        var point = this.editor.activeRseq.getPointById(record.raw.pointId);
                        if (type !== "signalGroup" && type !== "movement" ){
                            this.selectedMovement = record.parentNode.raw.movementId;
                        }
                        if (type !== "signalGroup" && type !== "movement" && point.getType() !== "ACTIVATION_2" ){
                            var resetFn = function(){
                                var windowOpened = editor.editForms.hasOpenWindows();
                                if(!windowOpened){
                                    editor.activeMovement = null;
                                }
                                this.editor.contextMenu.un("hide", resetFn,this);
                            };
                            this.editor.activeMovement = this.selectedMovement;
                            this.editor.contextMenu.on("hide", resetFn,this);
                            this.editor.contextMenu.show(event.clientX,event.clientY,false,true);
                        }
                        if(point && point.getType() === "ACTIVATION_2"){
                            var vehicleType = this.editor.getCurrentVehicleType();
                            var heeftEindpunt = this.editor.activeRseq.heeftUitmeldpuntEindpunt(this.editor.selectedObject) || vehicleType === "Hulpdiensten";
                            Ext.getCmp("addInmeldpuntOv").setDisabled(!heeftEindpunt);
                            Ext.getCmp("addInmeldpuntOvCoordinates").setDisabled(!heeftEindpunt);
                            Ext.getCmp("selectInmeldpuntOv").setDisabled(!heeftEindpunt);
                            this.uitmeldpuntMenu.showAt(event.clientX,event.clientY);
                        }else if((type === "signalGroup" || type === "movement") && this.editor.activeRseq.getEditable()){
                            this.otherMenu.showAt(event.clientX,event.clientY);
                        }
                    },
                    viewready : function(tree){
                        var view = tree.getView();
                        var dd = view.getPlugin('treeviewdragdrop');
                        dd.dragZone.lock();
                    }
                }
            });
            overzicht.add(this.tree);
            Ext.ComponentQuery.query('#rseqInfoWindow')[0].updateLayout();
        }
        Ext.getCmp("reorderPoints").setChecked(false);
        this.tree.scrollTo(0,scrollY);
        this.editor.helpPanel.updateHelpPanel();
    },
    updateLayerLabel: function() {
        if(!this.layerLabel) {
            this.layerLabel = document.createElement('div');
            this.layerLabel.className = 'layerLabel';
            var mapContainer = document.querySelector('.olMapViewport');
            if(mapContainer) {
                mapContainer.appendChild(this.layerLabel);
            }
        }
        this.layerLabel.innerHTML = 'Voertuigtype: ' + this.editor.getCurrentVehicleType();
    },
    updateSelection : function (point){
        if (this.tree !== null&& !Ext.getCmp("reorderPoints").checked){
            if(this.tree.view){
                var sm = this.tree.getSelectionModel();
                if (point !== null && point instanceof Point){
                    this.unhighlight(point.getId());
                    var root = this.tree.getRootNode();
                    var nodes = new Array();
                    this.findChildrenByPointId(root,point.getId(),nodes);
                    sm.select(nodes,false,true);
                } else{
                    sm.deselectAll();
                }
            }
        }
    },
    highlight : function (id){
        if (this.tree !== null && !Ext.getCmp("reorderPoints").checked){
            var view = this.tree.getView();
            var root = this.tree.getRootNode();
            var nodes = new Array();
            this.findChildrenByPointId(root,id,nodes);
            for (var i = 0;i < nodes.length;i++){
                var n = nodes[i];
                n.addCls(view.overItemCls);
            }
        }
    },
    unhighlight : function (id){
        if (this.tree !== null && !Ext.getCmp("reorderPoints").checked){
            var view = this.tree.getView();
            var root = this.tree.getRootNode();
            var nodes = new Array();
            this.findChildrenByPointId(root,id,nodes);
            for (var i = 0;i < nodes.length;i++){
                var n = nodes[i];
                n.removeCls(view.overItemCls);
            }
        }
    },
    createRootNode : function (json){
        var store = {
            root : {
                expanded : true,
                children : []
            }
        };
        for (var key in json){
            var signalGroup = json[key];
            var bewegingen = new Array();
            for (var bKey in signalGroup){
                var mv = signalGroup[bKey];
                var mvNode = this.createMovementNode(mv,bKey);
                if(mvNode !== null){
                    bewegingen.push(mvNode);
                }
            }
            if(bewegingen.length > 0){
                var label = this.getSignalgroupLabel(signalGroup);
                var node = {
                    text :label,
                    id : Ext.id(),//"sign-" + key,
                    expanded : true,
                    iconCls : "noTreeIcon",
                    type : "signalGroup",
                    allowDrag:false,
                    children : bewegingen
                };
                store.root.children.push(node);
            }
        }

        return store;
    },

    getSignalgroupLabel : function(signalgroup){
        var label = "Signaalgroep ";
        var nums = {};
        var currentVehicleType = this.editor.getCurrentVehicleType();
        for (var bKey in signalgroup){
            var movement = signalgroup[bKey];

            var points = movement.points;
            for (var i = 0 ; i < points.length; i++){
                var point = points[i];
                if(point.getType().indexOf("ACTIVATION") === -1){
                    continue;
                }
                var mvmnts = this.editor.activeRseq.findMovementsForPoint(point);
                for (var j = 0 ; j < mvmnts.length; j++){
                    var mvmnt = mvmnts[j];
                    if(mvmnt.movement.config.id === movement.id){
                        var map = mvmnt.map;
                        if(map.config.signalGroupNumber && mvmnt.movement.getVehicleType() === currentVehicleType){
                            nums[map.config.signalGroupNumber] = true;
                        }
                    }
                }
            }
        }

        for (var num in nums){
            label += num + ", ";
        }
        return label.substring(0, label.length -2);
    },
    createMovementNode : function (json,key){
        var points = new Array();
        for (var i = 0;i < json.points.length;i++){
            var pt = this.createPointNode(json.points[i],json.id);
            points.push(pt);
        }
        var movement = this.editor.activeRseq.getMovementById(json.id);
        if (movement.getVehicleType() === this.editor.getCurrentVehicleType()) {
            var label = this.getBewegingLabel(movement);
            var node = {
                text: label,
                id: Ext.id(), //"mvmt-" + json.id,
                expanded: true,
                icon: karTheme.richting,
                movementId: key,
                movementNumber: movement.getNummer(),
                allowDrag: false,
                iconCls: 'overviewTree',
                type: "movement",
                children: points
            };
            return node;
        } else {
            return null;
        }

    },
    createPointNode : function (point,movementId){
        var label = this.getPointLabel(point, movementId);
        var node = {
            text : label,
            id : Ext.id(),
            leaf : true,
            pointId : point.getId(),
            type : "point",
            iconCls : 'overviewTree',
            icon : this.getIconForPoint(point)
        };
        return node;
    },

    getPointLabel: function(point, movementId){
        var label = point.getLabel();

        var movement = this.editor.activeRseq.getMovementById(movementId);
        var maps = movement.getMaps();
        for(var i = 0 ; i < maps.length ;i++){
            if(maps[i].getPointId() === point.getId() && maps[i].getDistanceTillStopLine()){
                label += " (" + maps[i].config.distanceTillStopLine + " m)";
            }
        }
        return label;
    },

    getIconForPoint : function (point){
        switch (point.getType()){
            case "ACTIVATION_1" :
                return karTheme.inmeldPunt;
                break;
            case "ACTIVATION_2" :
                return karTheme.uitmeldPunt;
                break;
            case "ACTIVATION_3" :
                return karTheme.voorinmeldPunt;
                break;
            case "BEGIN" :
                return karTheme.startPunt;
                break;
            case "END" :
                return karTheme.eindPunt;
                break;
        }

    },
    getBewegingLabel : function (mvmnt){
        var begin = "";
        var eind = "";
        for (var i = 0;i < mvmnt.getMaps().length;i++){
            var map = mvmnt.getMaps()[i];
            var point = this.editor.activeRseq.getPointById(map.getPointId());
            if(!point){
                continue;
            }
            if (point.getType() === "END"){
                eind = point.getLabel();
            }

            if (point.getType() === "ACTIVATION_1" && begin === ""){
                begin = point.getLabel();
            }
            if (begin === null || begin === ""){
                if (point.getType() === "ACTIVATION_2"){
                    begin = point.getLabel();
                }
            }
        }

        var label = "Van " + begin + " naar " + eind;
        if(label === 'Van  naar '){
            label = '';
        }
        label += " (" + (mvmnt.getVehicleType() === "Hulpdiensten" ? "HD" : "OV") + ")";

        return label;
    },
    nodeDragged : function(){
        var mapsPerMovements = {};
        this.tree.getRootNode().cascadeBy (function(node){
            if(node.raw && node.raw.type === "movement"){
                var mapsPerMovement = this.getMapsPerMovement(node);
                mapsPerMovements [node.raw.movementId] = mapsPerMovement;
            }
        }, this);
        this.editor.activeRseq.reorderMaps(mapsPerMovements);
        this.editor.changeManager.changeOccured();
    },
    getMapsPerMovement :function(movementNode){
        var rseq = this.editor.activeRseq;
        var childs = movementNode.childNodes;

        var mapsPerMovement =[];
        Ext.Array.each(childs, function(child){
            var map = rseq.findMapForPoint(movementNode.raw.movementId,child.raw.pointId);
            mapsPerMovement.push(map.getId());
        });
        return mapsPerMovement;

    },
    findChildrenByPointId : function (record,pointId,result){
        var me = this;
        record.eachChild(function (child){
            if (child.raw.pointId === pointId){
                result.push(child);
            }
            if (child.hasChildNodes()){
                me.findChildrenByPointId(child,pointId,result);
            }
        });
    },
    isPoint : function (object){
        if ((object.cluster === null || object.cluster === undefined) && object.data.type !== "CROSSING" && object.data.type !== "GUARD" && object.data.type !== "BAR"){
            return true;
        } else{
            return false;
        }
    }
});
