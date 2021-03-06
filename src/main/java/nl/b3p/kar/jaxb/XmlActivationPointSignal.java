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

package nl.b3p.kar.jaxb;

import javax.xml.bind.annotation.*;
import nl.b3p.kar.hibernate.ActivationPointSignal;
import nl.b3p.kar.hibernate.MovementActivationPoint;
import nl.b3p.kar.hibernate.VehicleType;
import org.apache.commons.lang.ArrayUtils;

/**
 * Class voor kv9 XML omdat de JPA entity niet handig is om met JAXB te 
 * gebruiken.
 * 
 * @author Matthijs Laan
 */
@XmlType(name="ACTIVATIONPOINTSIGNALType", propOrder={
    "activationpointnumber",
    "karvehicletype",
    "karcommandtype",
    "triggertype",
    "distancetillstopline",
    "signalgroupnumber",
    "virtuallocalloopnumber"
})
@XmlAccessorType(XmlAccessType.FIELD)
public class XmlActivationPointSignal {
    
    private Integer activationpointnumber, karvehicletype, karcommandtype;
    private Integer distancetillstopline, signalgroupnumber, virtuallocalloopnumber;
    private String triggertype;
    @XmlTransient
    private final String[] CORRECT_TRIGGERTYPES = {"MANUAL", "STANDARD", "FORCED"};

    public XmlActivationPointSignal() {
    }
    
    public XmlActivationPointSignal(MovementActivationPoint map, VehicleType vt) {
        activationpointnumber = map.getPoint().getNummer();
        karvehicletype = vt.getNummer();
        ActivationPointSignal s = map.getSignal();
        karcommandtype = s.getKarCommandType();
        triggertype = s.getTriggerType();
        if(!ArrayUtils.contains(CORRECT_TRIGGERTYPES, triggertype)){
            switch(triggertype){
                case "0":
                case "6":
                case "8":
                case "9":
                case "10":
                case "11":
                    triggertype = "STANDARD";
                    break;
                case "1":
                    triggertype = "FORCED";
                    break;
                case "2":
                case "3":
                case "4":
                case "5":
                case "7":
                    triggertype = "MANUAL";
                    break;
                default:
                    triggertype = "";
                    break;
                    
            }
        }
        distancetillstopline = s.getDistanceTillStopLine();
        signalgroupnumber = s.getSignalGroupNumber();
        virtuallocalloopnumber = s.getVirtualLocalLoopNumber();
    }

    public Integer getActivationpointnumber() {
        return activationpointnumber;
    }

    public void setActivationpointnumber(Integer activationpointnumber) {
        this.activationpointnumber = activationpointnumber;
    }

    public Integer getKarvehicletype() {
        return karvehicletype;
    }

    public void setKarvehicletype(Integer karvehicletype) {
        this.karvehicletype = karvehicletype;
    }

    public Integer getKarcommandtype() {
        return karcommandtype;
    }

    public void setKarcommandtype(Integer karcommandtype) {
        this.karcommandtype = karcommandtype;
    }

    public Integer getDistancetillstopline() {
        return distancetillstopline;
    }

    public void setDistancetillstopline(Integer distancetillstopline) {
        this.distancetillstopline = distancetillstopline;
    }

    public Integer getSignalgroupnumber() {
        return signalgroupnumber;
    }

    public void setSignalgroupnumber(Integer signalgroupnumber) {
        this.signalgroupnumber = signalgroupnumber;
    }

    public Integer getVirtuallocalloopnumber() {
        return virtuallocalloopnumber;
    }

    public void setVirtuallocalloopnumber(Integer virtuallocalloopnumber) {
        this.virtuallocalloopnumber = virtuallocalloopnumber;
    }

    public String getTriggertype() {
        return triggertype;
    }

    public void setTriggertype(String triggertype) {
        this.triggertype = triggertype;
    }
}
