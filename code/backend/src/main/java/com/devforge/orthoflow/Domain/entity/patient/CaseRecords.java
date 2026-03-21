package com.devforge.orthoflow.Domain.entity.patient;


import com.devforge.orthoflow.Domain.entity.patient.history.*;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
@Entity
@Data
public class CaseRecords {
    @Id
    private Integer id;


    private LocalDate dateOfExamination;

    private String chiefComplaint;
    private String pastDentalHistory;
    private String pastMedicalHistory;
    private String familyHistory;
    private String socialHistory;
    private String allergies;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "periodontal_id")
    private PeriodontalStatus periodontalStatus;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "skeletal_id")
    private SkeletalRelationship skeletalRelationship;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "soft_tissue_id")
    private SoftTissueAnalysis softTissueAnalysis;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "dento_alveolar_id")
    private DentoAlveolarAnalysis dentoAlveolarAnalysis;

//    @OneToMany(cascade = CascadeType.ALL)
//    @JoinColumn(name = "case_id")
//    private List<Radiograph> radiographs;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "treatment_plan_id")
    private TreatmentPlan treatmentPlan;




}
