SPEC = dict(
    name='Crono', sheet='crono.png', face='left', credit='Chrono Trigger (Square) / SSF', sounds='Crono', height=56,
    anims=dict(
        idle=['3.0', '3.1'], walk='5.0-5.6', run=['13.8', '13.9'], crouch=['9.0'], jumpSquat=['9.0'],
        jump=['10.4'], doubleJump=['10.5', '10.6'], fall=['10.6'], land=['9.0'],
        shield=['6.0'], dodge=['9.5'], roll=['13.8', '13.9'], hurt=['11.0'], hurtAir=['11.1'], tumble=['11.1', '11.2'],
        lie=['11.6'], getup=['9.0'], taunt='17.0-17.2', win=['17.1', '17.2'],
        jab=['2.0', '2.1'], ftilt=['2.2', '2.3', '2.4'], utilt=['2.6', '2.7'], dtilt=['4.7', '4.8'], dash=['13.9', '2.5'],
        fsmash=['4.0', '4.1', '4.2'], usmash=['10.0', '10.1'], dsmash=['8.4', '8.5'],
        nair='6.12-6.18', fair=['6.9', '6.10'], uair=['10.2', '10.3'], dair=['10.7', '10.8'],
        neutralB=['13.0', '13.1', '13.2', '13.3'], sideB=['8.6', '8.7', '8.8'], upB='6.12-6.18', downB=['13.4', '13.5', '13.6', '13.7'],
        grab=['2.0', '6.11'],
    ),
    times=dict(idle=20, walk=7, run=5, nair=3, upB=3, neutralB=6, downB=6, taunt=10),
    moves=dict(upB=dict(vy=-8.5, helpless=True), sideB=dict(vx=6, hit=dict(dmg=11)),
               neutralB=dict(hit=dict(dmg=12)), downB=dict(hit=dict(dmg=10))),
    stats=dict(weight=95, walkSpeed=1.3, runSpeed=2.8, jumpForce=8.2, doubleJumpForce=7.4),
)
