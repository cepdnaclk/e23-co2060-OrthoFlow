package com.devforge.orthoflow.Domain.entity.patient.history;

import com.devforge.orthoflow.Domain.entity.patient.history.enums.*;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity
@Data
public class DentoAlveolarAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ElementCollection
    private List<String> lowerAnterior;

    @ElementCollection
    private List<String> lowerBuccal;

    @ElementCollection
    private List<String> upperAnterior;

    @ElementCollection
    private List<String> upperBuccal;

    @Enumerated(EnumType.STRING)
    private CanineAngulation canineAngulation;

    @Enumerated(EnumType.STRING)
    private IncisorRelationship incisorRelationship;

    @Enumerated(EnumType.STRING)
    private MolarRelationshipRight molarRelationshipRight;

    @Enumerated(EnumType.STRING)
    private MolarRelationshipLeft molarRelationshipLeft;

    @Enumerated(EnumType.STRING)
    private CannieRelationship cannieRelationshipRight;

    @Enumerated(EnumType.STRING)
    private CannieRelationship cannieRelationshipLeft;

    @ElementCollection
    private List<String> overjet;   // mm

    @Enumerated(EnumType.STRING)
    private Overbite overbite;  // mm

    @ElementCollection
    private List<String> crossbite;

    //think
    @ElementCollection
    private List<String> centerLineUpper;

    @ElementCollection
    private List<String> centerLineLower;

    //classification ?


}
