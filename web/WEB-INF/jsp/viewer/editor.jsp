<%@include file="/WEB-INF/taglibs.jsp" %>
<%@page errorPage="/WEB-INF/jsp/commons/errorpage.jsp" %>

<tiles:importAttribute/>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">

<html:html>
    <head>
        <title>KAR in GIS</title>
        <script language="JavaScript" type="text/JavaScript" src="<html:rewrite page="/js/validation.jsp" module=""/>"></script>
        <link rel="stylesheet" href="<html:rewrite page="/styles/kar-gis.css" module=""/>" type="text/css" media="screen" />
        <script type="text/javascript" src="<html:rewrite page="/js/json2.js" module=""/>"></script>
        <script type="text/javascript" src="<html:rewrite page="/js/utils.js" module=""/>"></script>
        <script type="text/javascript" src="<html:rewrite page="/js/simple_treeview.js" module=""/>"></script>
        <script type="text/javascript" src="<html:rewrite page="/dwr/engine.js" module=""/>"></script>
        <script type="text/javascript" src="<html:rewrite page="/dwr/interface/Editor.js" module=""/>"></script>
        <script type="text/javascript" src="<html:rewrite page="/js/swfobject.js" module=""/>"></script>
    </head>
    <body class="editor" style="width: 1270px">
        <div id="header">
            <div id="headerTitle">KAR in GIS</div>
        </div>

<script type="text/javascript">
    function testSelecteerObject() {
        var obj = prompt("Geef object aan als type:idnr, dus rseq:1, ag:23, a:456", "ag:635");
        if(obj == null) { /* no input, do nothing */
            return;
        }

        var type, id, valid = false;
        if(obj != null && obj.split(":").length == 2) {
            obj = obj.split(":");
            type = obj[0].toLowerCase();
            if(type == "rseq" || type == "ag" || type == "a") {
                id = parseInt(obj[1], 10);
                valid = !isNaN(id);
            }
        }
        if(!valid) {
            alert("Ongeldige invoer");
        } else {
            Editor.getObjectInfo(type, id, dwr_objectInfoReceived);
        }        
    }

    function treeItemClick(item) {
        tree_selectObject(item);
        form_editObject(item);
        if(document.getElementById("autoZoom").checked) {
            options_zoomToObject();
        }
    }

    function createLabel(container, item) {
        container.className = "node";

        var a = document.createElement("a");
        a.href = "#";
        a.onclick = function() {
            treeItemClick(item);
        };

        var idSpan = document.createElement("span");
        idSpan.className = "code";
        idSpan.appendChild(document.createTextNode(item.type.toUpperCase()));
        a.appendChild(idSpan);
        var labelText = " " + item.name;
        a.appendChild(document.createTextNode(labelText));
        container.appendChild(a);
    }

    var tree;
    var selectedObject;

    function createTreeview() {
        selectedObject = null;
        window.frames["form"].location = "about:blank";
        
        var treeEl = document.getElementById("objectTree");
        while(treeEl.firstChild != undefined) {
            treeEl.removeChild(treeEl.firstChild);
        }
        treeview_create({
            "id": "objectTree",
            "root": tree,
            "rootChildrenAsRoots": true,
            "itemLabelCreatorFunction": createLabel,
            "toggleImages": {
                "collapsed": "<html:rewrite page="/images/treeview/plus.gif" module=""/>",
                "expanded": "<html:rewrite page="/images/treeview/minus.gif" module=""/>",
                "leaf": "<html:rewrite page="/images/treeview/leaft.gif" module=""/>"
            },
            "saveExpandedState": false,
            "saveScrollState": false,
            "expandAll": false
        });
    }

    function dwr_objectInfoReceived(info) {
        if(info.toLowerCase().indexOf("error") == 0) {
            alert(info);
            return;
        }
        
        var obj = eval("(" + info + ")");
        tree = eval("(" + obj.tree + ")");
        createTreeview();
        if(tree.object != undefined) {
            setStatus("tree", "Object op locatie geselecteerd");

            var object = treeview_findItem(tree, obj.object);
            tree_selectObject(object);
            form_editObject(object);
            if(document.getElementById("autoZoom").checked) {
                options_zoomToObject();
            }
        } else {
            // TODO deselect object

            setStatus("tree", "Meerdere objecten op locatie");
        }
        if(obj.envelope != undefined) {
            zoomToEnvelope(eval("(" + obj.envelope + ")"));
        }
    }

    function tree_selectObject(object) {
        if(selectedObject != undefined) {
            container = treeview_getLabelContainerNodeForItemId("objectTree", selectedObject.id);
            container.className = "node";
        }
        selectedObject = object;
        document.getElementById("zoomButton").disabled = object.point == undefined;
        container = treeview_getLabelContainerNodeForItemId("objectTree", object.id);
        container.className = "selected node";
        treeview_expandItemParents("objectTree", object.id);
        treeview_expandItemChildren("objectTree", object.id);
    }

    function flamingo_karPuntSelected(type, id) {
        var shortType = null;
        switch(type) {
            case 'ACTIVATION': shortType = 'a'; break;
            case 'ACTIVATIONGROUP': shortType = 'ag'; break;
            case 'RoadSideEQuipment': shortType = 'rseq'; break;
        }
        if(shortType == null || isNaN(id)) {
            alert("Ongeldig object");
        } else {
            Editor.getKarPuntInfo(shortType, id, dwr_objectInfoReceived);
        }
    }

    function flamingo_moveToExtent(minx, miny, maxx, maxy){
        flamingo.callMethod("map", "moveToExtent", {
                minx: minx,
                miny: miny,
                maxx: maxx,
                maxy: maxy}
        , 0);
    }


    function setStatus(what, status) {
        document.getElementById(what + "Status").innerHTML = escapeHTML(status);
    }

    function form_editObject(object) {
        var url;
        switch(object.type) {
            case "a" : url = "<html:rewrite page="/activation.do"/>"; break;
            case "ag": url = "<html:rewrite page="/activationGroup.do"/>"; break;
            case "rseq": url = "<html:rewrite page="/roadsideEquipment.do"/>"; break;
        }
        url = url + "?id=" + object.id.split(":")[1];
        setStatus("form", "form laden voor object " + object.id + ": " + url);
        window.frames["form"].location = url;
    }

    var zoomBorder = 50;

    function options_zoomToObject() {
        if(selectedObject != undefined && selectedObject != null) {
            if(selectedObject.point) {
                var xy = selectedObject.point.split(", ");
                var x = parseInt(xy[0]); var y = parseInt(xy[1]);
                flamingo_moveToExtent(x - zoomBorder, y - zoomBorder, x + zoomBorder, y + zoomBorder);
            }
        }
    }

    function zoomToEnvelope(envelope) {
        flamingo_moveToExtent(envelope.minX - zoomBorder, envelope.minY - zoomBorder, envelope.maxX + zoomBorder, envelope.maxY + zoomBorder);
    }

    function flamingo_map_onIdentifyData(map, layer, data, identifyextent,nridentified, total) {
        if("map_kar_punten" == layer) {
            var features = data["kar_punten"];
            if(features != undefined) {
                Editor.getMultipleKarPuntInfo(JSON.stringify(features), dwr_objectInfoReceived);
            }
        }
    }

</script>

<div id="leftbar" style="margin-right: 15px; width: 360px; float: left">

    <div id="tree" style="margin: 5px; padding: 3px; border: 1px inset black; width: 100%; height: 392px;">

        Objectenboom
        <p>
        Status: <span id="treeStatus" style="font-weight: bold">Geen objecten geselecteerd</span>
        <p>
        <input type="button" value="Test: Selecteer/zoek een object" onclick="testSelecteerObject()">
        <div id="objectTree" style="width: 100%; height: 248px; border: 1px inset black;"></div>
        <div id="options" style="margin-top: 5px; width: 100%; height: 30px; border: none">
            <input id="zoomButton" type="button" value="Zoom naar object" onclick="options_zoomToObject();">
            <input type="button" value="Nieuw object" onclick="alert('Nog niet geimplementeerd');">
            <input type="button" value="Kopie�ren" onclick="alert('Nog niet geimplementeerd');">
            <label><input id="autoZoom" type="checkbox" value="autoZoom" checked="true">Auto-zoom</label>
        </div>
    </div>

    <div id="form" style="margin: 5px; padding: 3px;  border: 1px inset black; width: 100%; height: 405px;">

        <span style="display: none">Status: <span id="formStatus" style="font-weight: bold">Geen object</span></span>
        <iframe name="form" style="border: 0; width: 100%; height: 100%">    </iframe>

    </div>

</div>

<div id="kaart" style="margin: 5px 0px 5px 5px; padding: 3px; border: 1px solid black; width: 865px; height: 810px; float: left; clear: right">

    <div id="flashcontent" style="width: 100%; height: 100%;"></div>

<script type="text/javascript">
    var so = new SWFObject("<html:rewrite module="" page="/flamingo/flamingo.swf"/>?config=/config_editor.xml", "flamingo", "100%", "100%", "8", "#FFFFFF");
    so.write("flashcontent");
    var flamingo = document.getElementById("flamingo");
</script>

</div>

    </body>
</html:html>

