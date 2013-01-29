/**
* Geo-OV - applicatie voor het registreren van KAR meldpunten
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
 * Class dat als 'wrapper' functioneert om eenvoudig OpenLayers aan te sturen.
 **/
Ext.define("ol", {
    editor : null,
    map : null,
    panel : null,
    vectorLayer : null,
    rseqVectorLayer: null,
    geojson_format : null,
    gfi : null,
    dragFeature : null,
    point : null,
    line : null,
    
    /**
     * Het OpenLayers.Control dat geactiveerd wordt om een locatie aan te klikken
     * waar Street View geopend moet worden.
     */
    streetViewClickControl: null,
    
    identifyButton : null,
    overview : null,
    activeFeature : null,
    selectCtrl : null,
    highlight:null,
    measureTool:null,
    standaloneMeasure:null,
    constructor : function(editor){
        this.editor = editor;
        this.editor.on('activeRseqUpdated', this.updateVectorLayer, this);
        this.editor.on('selectedObjectChanged', this.toggleDragfeature, this);
    },
    /**
     *Maak een map
     */
    createMap : function(domId){
        var maxBounds = new OpenLayers.Bounds(12000,304000,280000,620000);
        this.panel = new OpenLayers.Control.Panel({
            allowDepress:true
        });
        //opties voor openlayers map.        
        var opt = {
            projection: new OpenLayers.Projection("EPSG:28992"),
            maxExtent: maxBounds,
            srs: 'epsg:28992', 
            allOverlays: true,
            resolutions: [3440.64,1720.32,860.16,430.08,215.04,107.52,53.76,26.88,13.44,6.72,3.36,1.68,0.84,0.42,0.21,0.105,0.0525],
            theme: OpenLayers._getScriptLocation()+'theme/b3p/style.css',
            units : 'm',
            controls : [this.panel]
        };
        //maak openlayers map
        this.map = new OpenLayers.Map(domId,opt);
        //maak vector layers.
        this.vectorLayer = new OpenLayers.Layer.Vector("Points", {
            styleMap: new OpenLayers.StyleMap( {
                "default": style,
                "select": selectstyle,
                "temporary" : tempstyle
            })
        }
        );
        this.rseqVectorLayer = new OpenLayers.Layer.Vector("RseqSelect", {
            styleMap: new OpenLayers.StyleMap( {
                "default": style,
                "select": selectstyle,
                "temporary" : tempstyle
            })
        }
        );
            
        this.geojson_format = new OpenLayers.Format.GeoJSON();
        this.map.addLayer(this.vectorLayer);
        this.map.addLayer(this.rseqVectorLayer);
        this.createControls(domId);
        
        OpenLayers.IMAGE_RELOAD_ATTEMPTS = 2;
        OpenLayers.Util.onImageLoadErrorColor = "transparent"; 
    },
    /**
     * Private method which adds all the controls
     */
    createControls : function (domId){
        var nav = new OpenLayers.Control.Navigation();
        this.map.addControl(nav);
        
        this.map.addControl( new OpenLayers.Control.MousePosition({
            numDigits: 2
        }));        
        this.map.addControl(new OpenLayers.Control.PanZoomBar());
        
        var options = new Object();
        options["persist"]=true;
        options["callbacks"]={
            modify: function (evt){
                //make a tooltip with the measured length
                if (evt.parent){
                    var measureValueDiv=document.getElementById("olControlMeasureValue");
                    if (measureValueDiv==undefined){
                        measureValueDiv=document.createElement('div');
                        measureValueDiv.id="olControlMeasureValue";
                        measureValueDiv.style.position='absolute';
                        this.map.div.appendChild(measureValueDiv);
                        measureValueDiv.style.zIndex="10000";
                        measureValueDiv.className="olControlMaptip";
                        var measureValueText=document.createElement('div');
                        measureValueText.id='olControlMeasureValueText';
                        measureValueDiv.appendChild(measureValueText);
                    }
                    var px= this.map.getViewPortPxFromLonLat(new OpenLayers.LonLat(evt.x,evt.y));
                    measureValueDiv.style.top=px.y+"px";
                    measureValueDiv.style.left=px.x+25+'px'
                    measureValueDiv.style.display="block";
                    var measureValueText=document.getElementById('olControlMeasureValueText');
                    var bestLengthTokens=this.getBestLength(evt.parent);
                    measureValueText.innerHTML= bestLengthTokens[0].toFixed(0)+" "+bestLengthTokens[1];
                }
            }
        };
        options["handlerOptions"]={
            style :{
                strokeColor : ""
            }
        };
        
        //voeg meet tool toe
        this.measureTool= new OpenLayers.Control.Measure( OpenLayers.Handler.Path, options);
      
        this.measureTool.events.register('measure',this.measureTool,function(){
            var measureValueDiv=document.getElementById("olControlMeasureValue");
            if (measureValueDiv){                
                measureValueDiv.style.display="none";
            }
            this.cancel();
        });
        this.measureTool.events.register('deactivate',this.measureTool,function(){
            var measureValueDiv=document.getElementById("olControlMeasureValue");
            if (measureValueDiv){
                measureValueDiv.style.display="none";
            }
        });
        
        this.map.addControl(this.measureTool);
        
        this.standaloneMeasure = Ext.create(Measure,{
            map: this.map,
            panel: this.panel
        });
        this.standaloneMeasure.on('measurechanged',function(){
            this.editor.changeCurrentEditAction("MEASURE");
        }, this);
        
        
        //voeg 'teken punt' tool toe.
        var me = this;
        this.point =  new OpenLayers.Control.DrawFeature(this.vectorLayer, OpenLayers.Handler.Point, {
            displayClass: 'olControlDrawFeaturePoint',
            featureAdded: function(feature ) {
                me.drawFeature(feature);
            }
        });
        //voeg 'teken line' tool toe.
        this.line = new OpenLayers.Control.DrawFeature(this.vectorLayer, OpenLayers.Handler.Path, {
            displayClass: 'olControlDrawFeaturePath'
        });
        this.line.events.register('featureadded', me, me.drawFeature);
        //voeg 'versleep feature' tool toe.
        this.dragFeature= new OpenLayers.Control.DragFeature(this.vectorLayer,{
            onComplete : me.dragComplete,
            featureCallbacks:{
                over: function(feature){
                    if(editor.selectedObject && feature.data.id == editor.selectedObject.getId() && editor.selectedObject.$className == feature.data.className){
                        this.overFeature(feature);
                    }
                }
            }
        });
        
        this.dragFeature.handlers['drag'].stopDown = false;
        this.dragFeature.handlers['drag'].stopUp = false;
        this.dragFeature.handlers['drag'].stopClick = false;
        this.dragFeature.handlers['feature'].stopDown = false;
        this.dragFeature.handlers['feature'].stopUp = false;
        this.dragFeature.handlers['feature'].stopClick = false;
        
        // streetViewClickControl
        
        var StreetViewClick = OpenLayers.Class(OpenLayers.Control, {
            defaultHandlerOptions: {
                'single': true,
                'double': false,
                'pixelTolerance': 0,
                'stopSingle': false,
                'stopDouble': false
            },
            
            initialize: function(options) {
                this.handlerOptions = OpenLayers.Util.extend({}, this.defaultHandlerOptions);
                OpenLayers.Control.prototype.initialize.apply(this, arguments);
                this.handler = new OpenLayers.Handler.Click(
                    this, {
                        'click': this.clicked
                    }, this.handlerOptions
                );
           },
           clicked: function(e) {
               var lonlat = this.map.getLonLatFromPixel(e.xy);
               this.events.triggerEvent("clicked", { lonlat: lonlat});
           }
        });
        this.streetViewClickControl = new StreetViewClick({
            eventListeners: {
                "clicked": me.streetViewClicked,
                scope: me
            },
            displayClass: 'olStreetViewClick'
        });
        this.map.addControl(this.streetViewClickControl);

        this.map.addControl(this.point);
        this.map.addControl(this.line);
        this.map.addControl(this.dragFeature);
        //maak en voeg achtergrond kaartlaag toe.
        var ovmLayer = new OpenLayers.Layer.TMS('BRTOverviewLayer', 'http://geodata.nationaalgeoregister.nl/tiles/service/tms/1.0.0',{
            layername:'brtachtergrondkaart', 
            type: 'png8',
            isBaseLayer:true,
            serverResolutions: [3440.64,1720.32,860.16,430.08,215.04,107.52,53.76],
            tileOrigin:new OpenLayers.LonLat(-285401.920000,22598.080000)
        });
        var maxBounds = new OpenLayers.Bounds(12000,304000,280000,620000);
        //Maak een overview kaart.
        this.overview = new OpenLayers.Control.OverviewMap({
            layers: [ovmLayer],
            mapOptions: {
                projection: new OpenLayers.Projection("EPSG:28992"),
                maxExtent: maxBounds,
                srs: 'epsg:28992', 
                resolutions: [3440.64,1720.32,860.16,430.08,215.04,107.52,53.76,26.88],
                theme: OpenLayers._getScriptLocation()+'theme/b3p/style.css',
                units : 'm'
            }
        });
        this.map.addControl(this.overview);
        //defineer de click afhandeling.
        var oClick = new OpenLayers.Control.Click({
            rightclick: function (evt){
                var f = editor.olc.getFeatureFromEvent(evt);
                var x = evt.clientX;
                var y = evt.clientY;
                if(f && f.layer.name == "RseqSelect"){
                    editor.loadRseqInfo({
                        karAddress: f.data.karAddress
                    },function(){
                        editor.contextMenu.show(x,y);
                    });
                }else if(f && f.layer.name == "Points"){
                    editor.contextMenu.show(x,y);
                }else{
                    editor.contextMenu.show(x,y,true);
                }
                return false;
            },
            click: function (evt){
                editor.setSelectedObject(null);
                editor.olc.selectCtrl.unselectAll();
                editor.contextMenu.deactivateContextMenu();
            },
            includeXY:true
        });
        
        this.map.addControl(oClick);
        oClick.activate();
        
        this.highlight = new OpenLayers.Control.SelectFeature([this.vectorLayer, this.rseqVectorLayer], {
            highlightOnly: true,
            renderIntent: "temporary",
            hover:true
        });
        
        this.map.addControl(this.highlight);
        this.highlight.activate();
        this.selectCtrl = new OpenLayers.Control.SelectFeature([this.vectorLayer, this.rseqVectorLayer],{
            clickout: true,
            onSelect : function (feature){
                if(feature && feature.layer.name == "RseqSelect"){
                    editor.loadRseqInfo({
                        karAddress: feature.data.karAddress
                    });
                }else{
                    editor.setSelectedObject(feature);
                }
            },
            onUnselect : function(feature){
                if(feature && feature.layer.name == "Points"){
                    editor.setSelectedObject(null);
                }
            }
        });
        this.map.addControl(this.selectCtrl);
        this.selectCtrl.activate();
    },
    /**
     * Update de vector layer met de roadside equipment in de editor
     */
    updateVectorLayer : function(){
        this.removeAllFeatures();
        var geoJson = this.editor.activeRseq.toGeoJSON();
        this.addFeatures(geoJson);
        var selected = this.editor.selectedObject;
        this.selectFeature(selected.getId(), selected.$className);
        
    },
    /**
     * Selecteert een feature.
     * @param id id van de gewenste feature
     * @param className van de gewenste feature.
     */
    selectFeature : function(id,className){
        var olFeature = null;
        if(className=="RSEQ"){
            olFeature = this.vectorLayer.getFeaturesByAttribute("className",className)[0];
        }else{
            // Haal alle features op voor het id: dit kunnen punten en een rseq zijn
            var all =this.vectorLayer.getFeaturesByAttribute("id",id);
            for(var i = 0 ; i < all.length ;i++){
                var f = all[i];
                if(f.data.className == "Point"){
                    // Eerste zal altijd de goede zijn vanwege serial id in db
                    olFeature = f;
                    break;
                }
            }
        }
        
        if(olFeature && (this.vectorLayer.selectedFeatures.length==0||this.vectorLayer.selectedFeatures[0].data.id != id)){
            this.selectCtrl.unselectAll();
            this.selectCtrl.select(olFeature)
        }
    },
    /**
     * Toggle(aan/uit) de sleep feature functionaliteit/tool
     */
    toggleDragfeature : function (feature){
        if(feature){
            this.dragFeature.activate();
        }else{
            this.dragFeature.deactivate();
        }
    },
    /**
     * Event dat aangeroepen wordt zodra er featureinfo is gevonden (Bijvoorbeeld doormiddel van een klik)
     * @param evt het event eigenschappen
     */
    raiseOnDataEvent : function(evt){
        var stub = new Object();          
        var walapparatuur = new Array();
        walapparatuur[0] = {
            id: "424"
        };
        
        stub.walapparatuur = walapparatuur;
        onIdentifyData("map_kar_layer",stub);
        this.identifyButton.deactivate();
    },
    /**
     * Add a layer. Assumed is that everything is in epsg:28992, units in meters and the maxextent is The Netherlands
     * @param type The type of the layer [WMS/TMS]
     * @param name The name of the layer
     * @param url The url to the service
     * @param layers The layers of the service which must be retrieved
     * @param visible Indicates whether or not the layer must be visible from start
     * @param extension Optional parameter to indicate the extension (type)
     */
    addLayer : function (type,name, url, layers,visible,extension){
        var layer;
        if(type == 'WMS'){
            layer = new OpenLayers.Layer.WMS(name,url,{
                'layers':layers,
                'transparent': true
            },{
                singleTile: true,
                ratio: 1,
                isBaseLayer: false,
                transitionEffect: 'resize'
            });
        }else if (type == "TMS" ){
            if(!extension){
                extension = 'png';
            }
            layer = new OpenLayers.Layer.TMS(name, url,{
                layername:layers, 
                type: extension,
                isBaseLayer:false,
                serverResolutions: [3440.64,1720.32,860.16,430.08,215.04,107.52,53.76,26.88,13.44,6.72,3.36,1.68,0.84,0.42,0.21],
                tileOrigin:new OpenLayers.LonLat(-285401.920000,22598.080000)
            });
        }else{
        //console.log("Type " + type + " not known.");
        }
        if(layer){
            layer.setVisibility(visible);
            this.map.addLayer(layer);
            this.map.setLayerIndex(this.vectorLayer, this.map.getLayerIndex(layer)+1);
            this.map.setLayerIndex(this.rseqVectorLayer, this.map.getLayerIndex(layer)+2);
        }
    },
    /**
     * Kijk of een layer zichtbaar is\
     * @param name de naam van de layer.
     * @return true/false zichtbaarheid van de layer
     */
    isLayerVisible : function (name){
        var lyrs = this.map.getLayersByName(name);
        if(lyrs && lyrs.length > 0){
            return lyrs[0].visibility;
        }
        return false;
    },
    /**
     *Verander de zichtbaarheid van een layer
     *@param name de naam van de gewenste layer
     *@param vis true/false zichtbaar/niet zichtbaar
     */
    setLayerVisible : function (name,vis){
        var lyrs = this.map.getLayersByName(name);
        if(lyrs && lyrs.length > 0){
            var layer = lyrs[0];
            layer.setVisibility(vis);
        }
    },
    /**
     * Zoom het kaart beeld naar de gegeven extent
     * @param minx minimale x
     * @param miny minimale y
     * @param maxx maximale x
     * @param maxy maximale y
     */
    zoomToExtent : function (minx,miny,maxx,maxy){
        this.map.zoomToExtent([minx,miny,maxx,maxy]);
    },
    /**
     * Update het kaartbeeld door alle layers opnieuw te tekenen/op te halen
     */
    update : function (){
        for ( var i = 0 ; i< this.map.layers.length ;i++ ){
            var layer = this.map.layers[i];
            layer.redraw(true);
        }
    },
    /**
     * Voeg nieuw sld toe aan de kaarten.
     * @param walsld sld voor de wal apparatuur
     * @param trigsld sld voor de triggerpunten
     * @param signsld sld voor de signaalgroepen
     */
    addSldToKargis : function (walsld,trigsld, signsld){
        var wal = this.map.getLayersByName("walapparatuur")[0];
        var trig = this.map.getLayersByName("triggerpunten")[0];
        var sign = this.map.getLayersByName("signaalgroepen")[0];
        wal.mergeNewParams({
            sld:walsld
        });
        trig.mergeNewParams({
            sld:trigsld
        });
        sign.mergeNewParams({
            sld:signsld
        });
    },
    /**
     * Haal de sld's van de layers 'walapparatuur','triggerpunten','signaalgroepen'
     */
    removeSldFromKargis : function (){
        var wal = this.map.getLayersByName("walapparatuur")[0];
        var trig = this.map.getLayersByName("triggerpunten")[0];
        var sign = this.map.getLayersByName("signaalgroepen")[0];
        wal.mergeNewParams({
            sld:null
        });
        trig.mergeNewParams({
            sld:null
        });
        sign.mergeNewParams({
            sld:null
        });
        
    },
    //All the vectorlayer functions
    /**
     * Teken het punt meegegeven punt
     * @param wkt het punt als WKT (Well Known Text). Als deze parameter niet wordt
     * meegegeven dan wordt het tekenen gestart en kan de gebruiker zelf tekenen
     */
    drawPoint : function(wkt){
        if(wkt){
            var olFeature = new OpenLayers.Geometry.Point(wkt[0],wkt[1]);
            geometryDrawUpdate(olFeature.toString());
            this.point.drawFeature(olFeature);
        }else{
            this.point.activate();
        }
        this.dragFeature.activate();
    },
    /**
     * Teken de meegegeven lijn
     * @param wkt de lijn als WKT (Well Known Text). Als deze parameter niet wordt
     * meegegeven dan wordt het tekenen gestart en kan de gebruiker zelf tekenen
     */    
    drawLine : function(wkt){
        if(wkt){
            var olFeature = new OpenLayers.Geometry.fromWKT(wkt);
            this.line.drawFeature(olFeature);
        }else{
            this.line.activate();
        }
        this.dragFeature.activate();
    },
    /**
     * Teken een lijn vanaf een bepaald punt
     * @param x de x coordinaat waar begonnen moet worden
     * @param y de y coordinaat waar begonnen moet worden
     */    
    drawLineFromPoint : function (x,y){
        var lonlat = new OpenLayers.LonLat (x,y);
        var pixel = this.map.getPixelFromLonLat(lonlat);
        this.measureTool.activate();
        this.line.activate();
        this.line.handler.createFeature(pixel);
        this.line.handler.insertXY(x,y);
        this.measureTool.handler.createFeature(pixel);
        this.measureTool.handler.insertXY(x,y);
    },
    /**
     * Verwijder alle features die getekend zijn op de vectorlayer     * 
     */
    removeAllFeatures : function(){
        this.vectorLayer.removeAllFeatures();
        this.dragFeature.deactivate();
    },
    /**
     * Verwijder alle features die getekend zijn als road side equipment.
     */
    removeAllRseqs: function(){
        this.rseqVectorLayer.removeAllFeatures();
    },
    /**
     * Event dat aangeroepen wordt als de gebruiker klaar is met het verslepen 
     * van een feature
     * @param feature de feature die verplaatst is.
     */
    dragComplete : function (feature){
        var x = feature.geometry.x;
        var y = feature.geometry.y;
        editor.changeGeom(feature.data.className, feature.data.id, x,y);
    },
    /**
     * Teken een feature
     * @param object.feature de feature die getekend moet worden     
     */
    drawFeature : function (object){
        var feature =object.feature;
        var lastPoint = feature.geometry.components[feature.geometry.components.length-1];
        this.point.deactivate();
        this.line.deactivate();
        this.measureTool.deactivate();
        this.editor.pointFinished(lastPoint);
        this.highlight.activate();
    // TODO fire event geometry updated
    },
    /**
     * Activeer een feature op de kaart.
     * @param feature de feature die geactiveerd moet worden
     */
    setActiveFeature : function (feature){
        this.activeFeature = feature;
    },
    /**
     * Voeg 1 of meer features toe.
     * @param features een object met feature(s) in GeoJSON formaat
     */
    addFeatures : function(features){
        this.vectorLayer.addFeatures(this.geojson_format.read(features));
    },
    /**
     * Voeg 1 of meer road side equipment features toe
     * @param rseqs rseqs die toegevoegd moeten worden in GeoJSON formaat.
     */
    addRseqs : function(rseqs){
        this.rseqVectorLayer.addFeatures(this.geojson_format.read(rseqs));
    },
    /**
     * Haal de feature op uit de twee bestaande vectorlagen.
     * @param e Het event om de feature uit te halen
     */
    getFeatureFromEvent : function (e){
        var f = editor.olc.vectorLayer.getFeatureFromEvent(e);
        if(f){
            return f;
        }
        var rseq = editor.olc.rseqVectorLayer.getFeatureFromEvent(e);
        if(rseq){
            return rseq;
        }
        return rseq;
    },
    /**
     * Update de grote van de kaart.
     */
    resizeMap : function(){
        this.map.updateSize();
    }
});
/**
 * Hieronder volgen een aantal styles die worden gebruikt om features op de vectorlayers
 * van OpenLayers te tekenen.
 */
var style = new OpenLayers.Style(
// the first argument is a base symbolizer
// all other symbolizers in rules will extend this one
{
    graphicWidth: 28,
    graphicHeight: 28,
    graphicYOffset: -14, // shift graphic up 28 pixels
    labelYOffset: -15,
    label: "${label}" // label will be foo attribute value
},
// the second argument will include all rules
{
    rules: [
    new OpenLayers.Rule({
        // a rule contains an optional filter
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type", // the "foo" feature attribute
            value: "CROSSING"
        }),
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.crossing,
            graphicYOffset: -16,
            label: "${description}"
        }
    }),
    new OpenLayers.Rule({
        // a rule contains an optional filter
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type", // the "foo" feature attribute
            value: "GUARD"
        }),
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.guard,
            graphicYOffset: -16,
            label: "${description}"
        }
    }),
    new OpenLayers.Rule({
        // a rule contains an optional filter
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type", // the "foo" feature attribute
            value: "BAR"
        }),
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.bar,
            graphicYOffset: -16,
            label: "${description}"
        }
    }),
    new OpenLayers.Rule({
        // a rule contains an optional filter
        elseFilter: true,
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.punt,
            label: "",
            strokeColor: "#99BCE8",
            strokeLinecap: "butt",
            strokeDashstyle: "longdash"
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"ACTIVATION_1"
        }),
        symbolizer: {
            externalGraphic: karTheme.inmeldPunt
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"ACTIVATION_2"
        }),
        symbolizer: {
            externalGraphic: karTheme.uitmeldPunt
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"ACTIVATION_3"
        }),
        symbolizer: {
            externalGraphic: karTheme.voorinmeldPunt
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"END"
        }),
        symbolizer: {
            externalGraphic: karTheme.eindPunt,
            graphicYOffset: -25,
            graphicXOffset: -5
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"BEGIN"
        }),
        symbolizer: {
            externalGraphic: karTheme.startPunt,
            graphicYOffset: -25,
            graphicXOffset: -5
        }
    })
    ]
}
);

var selectstyle = new OpenLayers.Style(
// the first argument is a base symbolizer
// all other symbolizers in rules will extend this one
{
    graphicWidth: 37,
    graphicHeight: 39,
    graphicYOffset: -21, 
    labelYOffset: -20,
    label: "${label}" 
},
// the second argument will include all rules
{
    rules: [
    new OpenLayers.Rule({
        // a rule contains an optional filter
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type", // the "foo" feature attribute
            value: "CROSSING"
        }),
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.crossing_selected,
            label: "${description}",
            graphicYOffset: -26
        }
    }),
    new OpenLayers.Rule({
        // a rule contains an optional filter
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type", // the "foo" feature attribute
            value: "GUARD"
        }),
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.guard_selected,
            graphicYOffset: -26,
            label: "${description}"
        }
    }),
    new OpenLayers.Rule({
        // a rule contains an optional filter
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type", // the "foo" feature attribute
            value: "BAR"
        }),
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.bar_selected,
            graphicYOffset: -26,
            label: "${description}"
        }
    }),
    new OpenLayers.Rule({
        // a rule contains an optional filter
        elseFilter: true,
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.punt_selected,
            label: "",
            strokeColor: "#99BCE8",
            strokeLinecap: "butt",
            strokeDashstyle: "longdash"
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"ACTIVATION_1"
        }),
        symbolizer: {
            externalGraphic: karTheme.inmeldPunt_selected
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"ACTIVATION_2"
        }),
        symbolizer: {
            externalGraphic: karTheme.uitmeldPunt_selected
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"ACTIVATION_3"
        }),
        symbolizer: {
            externalGraphic: karTheme.voorinmeldPunt_selected
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"END"
        }),
        symbolizer: {
            externalGraphic: karTheme.eindPunt_selected,
            graphicYOffset: -33,
            graphicXOffset: -6
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"BEGIN"
        }),
        symbolizer: {
            externalGraphic: karTheme.startPunt_selected,
            graphicYOffset: -33,
            graphicXOffset: -6
        }
    })
    ]
}
);


var tempstyle = new OpenLayers.Style(
// the first argument is a base symbolizer
// all other symbolizers in rules will extend this one
{
    graphicWidth: 37,
    graphicHeight: 39,
    graphicYOffset: -21, 
    labelYOffset: -20,
    label: "${label}" 
},
// the second argument will include all rules
{
    rules: [
    new OpenLayers.Rule({
        // a rule contains an optional filter
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type", // the "foo" feature attribute
            value: "CROSSING"
        }),
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.crossing,
            label: "${description}",
            graphicYOffset: -26
        }
    }),
    new OpenLayers.Rule({
        // a rule contains an optional filter
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type", // the "foo" feature attribute
            value: "GUARD"
        }),
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.guard,
            graphicYOffset: -26,
            label: "${description}"
        }
    }),
    new OpenLayers.Rule({
        // a rule contains an optional filter
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type", // the "foo" feature attribute
            value: "BAR"
        }),
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.bar,
            graphicYOffset: -26,
            label: "${description}"
        }
    }),
    new OpenLayers.Rule({
        // a rule contains an optional filter
        elseFilter: true,
        // if a feature matches the above filter, use this symbolizer
        symbolizer: {
            externalGraphic: karTheme.point,
            label: "",
            strokeColor: "#99BCE8",
            strokeLinecap: "butt",
            strokeDashstyle: "longdash"
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"ACTIVATION_1"
        }),
        symbolizer: {
            externalGraphic: karTheme.signInPoint
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"ACTIVATION_2"
        }),
        symbolizer: {
            externalGraphic: karTheme.signOutPoint
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"ACTIVATION_3"
        }),
        symbolizer: {
            externalGraphic: karTheme.preSignInPoint
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"END"
        }),
        symbolizer: {
            externalGraphic: karTheme.endPoint,
            graphicYOffset: -33,
            graphicXOffset: -6
        }
    }),
    new OpenLayers.Rule({   
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "type",
            value:"BEGIN"
        }),
        symbolizer: {
            externalGraphic: karTheme.startPoint,
            graphicYOffset: -33,
            graphicXOffset: -6
        }
    })
    ]
}
);
/**
 * Create a Click controller
 * @param options
 * @param options.handlerOptions options passed to the OpenLayers.Handler.Click
 * @param options.click the function that is called on a single click (optional)
 * @param options.dblclick the function that is called on a dubble click (optional)
 */
OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control,{
    defaultHandlerOptions: {
        'single': true,
        'double': false,
        'stopSingle': false,
        'stopDouble': false
    },
    handleRightClicks:true,
    /**
     * @constructor
     */    
    initialize: function(options) {
        this.handlerOptions = OpenLayers.Util.extend(
        {}, this.defaultHandlerOptions
            );
        Ext.apply(this.handlerOptions,options.handlerOptions);
        OpenLayers.Control.prototype.initialize.apply(
            this, arguments
            );
        if (options.click){
            this.onClick=options.click;
        }
        if (options.dblclick){
            this.onDblclick=options.dblclick;
        }
        if (options.rightclick){
            this.onRightclick=options.rightclick;
        }
        this.handler = new OpenLayers.Handler.Click(
            this, {
                'click': this.onClick,
                'dblclick': this.onDblclick,
                'rightclick' : this.onRightclick
            }, this.handlerOptions
            );
    },
    /**
     * functie dat wordt aangeroepen zodra er wordt geklikt. Functie moet overschreven worden
     * in object dat deze classe implementeerd.
     */
    onClick: function(evt) {        
    },
    /**
     * functie dat wordt aangeroepen zodra er dubbel wordt geklikt. Functie moet overschreven worden
     * in object dat deze classe implementeerd.
     */
    onDblclick: function(evt) {          
    },
    /**
     * functie dat wordt aangeroepen zodra er met de rechter muis wordt geklikt. 
     * Functie moet overschreven worden in object dat deze classe implementeerd.
     */
    onRightclick : function (evt){
    }
});