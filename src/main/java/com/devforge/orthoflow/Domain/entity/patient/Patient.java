package com.devforge.orthoflow.Domain.entity.patient;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;

import java.time.LocalDate;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Patient {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String patientNumber;
    @NonNull
    private String firstName;
    private String lastName;
    private String gender;
    private LocalDate dateOfBirth;
    private Integer age;
    private String sex;
    private String nic;
    private String address;
    private String phone;
    @Email
    private String email;
    private String guardianName;
    private String guardianPhone;


    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "case_id", referencedColumnName = "id")
    private CaseRecords caseRecords;
}
